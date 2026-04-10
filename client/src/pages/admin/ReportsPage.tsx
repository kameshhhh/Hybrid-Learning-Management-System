import { useState, useEffect, useMemo } from "react";
import { adminService } from "@/services/admin";
import {
   GlassCard,
   GlassCardHeader,
   GlassCardContent,
   StatsCard,
   Button,
   Badge
} from "@/components/ui";
import { PieChart, GraduationCap, CheckCircle, Clock, FileSpreadsheet, FileText, Search } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ReportsPage = () => {
   const [activeTab, setActiveTab] = useState<"overview" | "master_export">("overview");

   // Overview Data
   const [reportData, setReportData] = useState<any>(null);

   // Master Export Data
   const [masterData, setMasterData] = useState<{ students: any[], skills: any[], enrollments: any[], logs: any[] } | null>(null);

   const [loading, setLoading] = useState(true);

   // Filters for Master Data
   const [filterDepartment, setFilterDepartment] = useState("");
   const [filterSkill, setFilterSkill] = useState("");
   const [searchQuery, setSearchQuery] = useState("");

   useEffect(() => {
      fetchReportData();
   }, []);

   const fetchReportData = async () => {
      try {
         setLoading(true);
         const [overviewRes, masterRes] = await Promise.all([
            adminService.getReportsOverview(),
            adminService.getMasterReport()
         ]);

         if (overviewRes.success) setReportData(overviewRes.data);
         if (masterRes.success) setMasterData(masterRes.data);
      } catch (error: any) {
         toast.error(error?.response?.data?.error?.message || "Failed to fetch reports");
      } finally {
         setLoading(false);
      }
   };

   // Build a highly optimized, flat dataset joining student with their enrollments organically.
   const flatExportData = useMemo(() => {
      if (!masterData) return [];

      const { students, skills, enrollments, logs } = masterData;
      const flatList: any[] = [];

      // Construct a map of skills for O(1) lookup
      const skillMap = new Map(skills.map(s => [s.id, s]));

      // Construct a map of logs count: key = studentId_skillId
      const logsMap = new Map(logs.map(l => [`${l.studentId}_${l.skillId}`, l._count]));

      students.forEach(student => {
         // Find all enrollments for this student
         const studentEnrollments = enrollments.filter(e => e.studentId === student.id);

         if (studentEnrollments.length === 0) {
            // Un-enrolled student row
            flatList.push({
               "Student Name": student.fullName,
               "Email / Roll": `${student.email} ${student.rollNumber || ''}`,
               "Department": student.department || "N/A",
               "Year": student.yearOfStudy || "N/A",
               "College": student.collegeName || "N/A",
               "Status": student.isBlocked ? "Frozen" : (student.isActive ? "Active" : "Inactive"),
               "Assigned Course": "None",
               "Faculty": "N/A",
               "Progress (%)": "0%",
               "Tasks Matrix (Done/Total)": "0",
               "Total Logs Submitted": "0",
               _rawDept: student.department || "",
               _rawSkillId: "NONE",
               _searchToken: `${student.fullName} ${student.email} ${student.department}`.toLowerCase()
            });
         } else {
            // Enrolled student rows (split per enrollment for detailed matrix logic requested)
            studentEnrollments.forEach(enrollment => {
               const skill = skillMap.get(enrollment.skillId);
               const facultyLabel = skill?.faculty?.map((f: any) => f.faculty.fullName).join(", ") || "No Faculty";
               const totalSkillTasks = skill?._count?.tasks || 0;
               const logCount = logsMap.get(`${student.id}_${enrollment.skillId}`) || 0;

               flatList.push({
                  "Student Name": student.fullName,
                  "Email / Roll": `${student.email} ${student.rollNumber ? `(${student.rollNumber})` : ''}`,
                  "Department": student.department || "N/A",
                  "Year": student.yearOfStudy || "N/A",
                  "College": student.collegeName || "N/A",
                  "Status": student.isBlocked ? "Frozen" : (student.isActive ? "Active" : "Inactive"),
                  "Assigned Course": skill?.name || "Unknown",
                  "Faculty": facultyLabel,
                  "Progress (%)": `${enrollment.progressPercentage}%`,
                  "Marks Obtained": Number(enrollment.totalMarksObtained || 0).toFixed(1),
                  "Tasks Matrix (Done/Total)": `${enrollment.totalTasksCompleted} / ${totalSkillTasks}`,
                  "Total Logs Submitted": logCount.toString(),
                  "Completion Date": enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleDateString() : "Pending",
                  _rawDept: student.department || "",
                  _rawSkillId: skill?.id || "UNKNOWN",
                  _searchToken: `${student.fullName} ${student.email} ${student.department} ${skill?.name}`.toLowerCase()
               });
            });
         }
      });

      // Apply Filters natively mapping to the grid
      return flatList.filter(row => {
         if (filterDepartment && row._rawDept !== filterDepartment && filterDepartment !== "ALL") return false;
         if (filterSkill && row._rawSkillId !== filterSkill && filterSkill !== "ALL") return false;
         if (searchQuery && !row._searchToken.includes(searchQuery.toLowerCase())) return false;
         return true;
      });

   }, [masterData, filterDepartment, filterSkill, searchQuery]);

   // Strip hidden keys before Export
   const getCleanExportPayload = () => flatExportData.map(row => {
      const { _rawDept, _rawSkillId, _searchToken, ...cleanRow } = row;
      return cleanRow;
   });

   const exportToExcel = () => {
      const payload = getCleanExportPayload();
      if (payload.length === 0) return toast.error("No data to export");
      const ws = XLSX.utils.json_to_sheet(payload);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "MasterReport");
      XLSX.writeFile(wb, `SkillCourse_MasterData_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Excel Downloaded natively!");
   };

   const exportToPDF = () => {
      const payload = getCleanExportPayload();
      if (payload.length === 0) return toast.error("No data to export");
      const doc = new jsPDF('landscape');

      // Columns
      const columns = Object.keys(payload[0]);
      // Rows
      const rows = payload.map(obj => Object.values(obj) as any[]);

      doc.setFontSize(14);
      doc.text("SkillCourse Master Administrative Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

      autoTable(doc, {
         startY: 28,
         head: [columns],
         body: rows,
         theme: 'grid',
         styles: {
            fontSize: 8,
            cellPadding: 3,
            overflow: 'linebreak'
         },
         headStyles: {
            fillColor: [139, 92, 246], // Purple-500
            textColor: [255, 255, 255],
            fontStyle: 'bold'
         },
         columnStyles: {
            0: { cellWidth: 35 }, // Student Name
            1: { cellWidth: 50 }, // Contact (Email)
            4: { cellWidth: 40 }, // Assigned Course
            5: { cellWidth: 35 }, // Faculty
            7: { cellWidth: 20, halign: 'center' }, // Marks
            8: { cellWidth: 25, halign: 'center' }  // Matrix
         },
         alternateRowStyles: {
            fillColor: [248, 250, 252] // Slate-50
         }
      });

      doc.save(`SkillCourse_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF Downloaded natively!");
   };

   if (loading) return <p>Loading reports...</p>;
   if (!reportData) return <p>Failed to load data.</p>;

   // Distinct Departments & Skills for Dropdowns natively using flat map array set
   const departmentOptions = Array.from(new Set(masterData?.students.map(s => s.department).filter(Boolean)));
   const skillOptions = masterData?.skills || [];

   return (
      <div className="space-y-6">
         {/* Header */}
         <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
               Reports & Analytics Engine
            </h1>
            <p className="text-slate-500 mt-1">Platform overview and deep data extraction mechanics.</p>
         </div>

         <div className="flex gap-4 border-b border-slate-200 pb-2">
            <button
               onClick={() => setActiveTab('overview')}
               className={`pb-2 px-1 border-b-2 font-medium transition-colors ${activeTab === 'overview' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
               Dashboard Overview
            </button>
            <button
               onClick={() => setActiveTab('master_export')}
               className={`pb-2 px-1 border-b-2 font-medium transition-colors ${activeTab === 'master_export' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
               Master Data & Exports
            </button>
         </div>

         {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-300">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <StatsCard
                     title="Total Users"
                     value={reportData.totalUsers}
                     icon={<PieChart size={24} />}
                     accentColor="purple"
                  />
                  <StatsCard
                     title="Students"
                     value={reportData.usersByRole?.student || 0}
                     icon={<GraduationCap size={24} />}
                     accentColor="blue"
                  />
                  <StatsCard
                     title="Average Progress"
                     value={`${Number(reportData.averageProgress).toFixed(1)}%`}
                     icon={<CheckCircle size={24} />}
                     accentColor="green"
                  />
                  <StatsCard
                     title="Recent Enrollments"
                     value={reportData.recentEnrollments}
                     icon={<Clock size={24} />}
                     accentColor="orange"
                  />
               </div>

               <GlassCard variant="secondary" padding="lg">
                  <GlassCardHeader title="Skills Status Breakdown" />
                  <GlassCardContent>
                     <div className="flex gap-4">
                        {Object.keys(reportData.skillsByStatus || {}).map((status) => (
                           <div key={status} className="p-4 bg-white/40 rounded-xl shadow-sm text-center flex-1">
                              <p className="text-sm font-medium text-slate-500 capitalize">{status.replace("_", " ")}</p>
                              <p className="text-3xl font-bold text-slate-800 mt-1">{reportData.skillsByStatus[status]}</p>
                           </div>
                        ))}
                        {Object.keys(reportData.skillsByStatus || {}).length === 0 && (
                           <p className="text-slate-500">No skills data available.</p>
                        )}
                     </div>
                  </GlassCardContent>
               </GlassCard>
            </div>
         )}

         {activeTab === 'master_export' && (
            <div className="space-y-4 animate-in fade-in duration-300">
               <GlassCard variant="secondary" padding="lg">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                     {/* Filter Group */}
                     <div className="flex flex-wrap items-center gap-3 flex-1 w-full">
                        <div className="relative">
                           <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                           <input
                              type="text"
                              placeholder="Search student or email..."
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none w-full md:w-64 shadow-sm"
                           />
                        </div>
                        <select
                           value={filterDepartment}
                           onChange={e => setFilterDepartment(e.target.value)}
                           className="px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none shadow-sm"
                        >
                           <option value="">All Departments</option>
                           {departmentOptions.map(d => (
                              <option key={d} value={d}>{d}</option>
                           ))}
                        </select>
                        <select
                           value={filterSkill}
                           onChange={e => setFilterSkill(e.target.value)}
                           className="px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none shadow-sm"
                        >
                           <option value="">All Courses/Skills</option>
                           <option value="NONE">- Unassigned Students -</option>
                           {skillOptions.map(sk => (
                              <option key={sk.id} value={sk.id}>{sk.name}</option>
                           ))}
                        </select>
                     </div>

                     {/* Export Group */}
                     <div className="flex items-center gap-2">
                        <Button variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" onClick={exportToExcel}>
                           <FileSpreadsheet size={16} className="mr-2" /> Export Excel
                        </Button>
                        <Button variant="outline" className="text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100" onClick={exportToPDF}>
                           <FileText size={16} className="mr-2" /> Export PDF
                        </Button>
                     </div>
                  </div>

                  <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm max-h-[60vh] overflow-y-auto">
                     <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                        <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                           <tr className="text-slate-600 font-semibold uppercase tracking-wider text-xs">
                              <th className="py-3 px-4 border-b">Student</th>
                              <th className="py-3 px-4 border-b">Contact</th>
                              <th className="py-3 px-4 border-b">Department</th>
                              <th className="py-3 px-4 border-b">Status</th>
                              <th className="py-3 px-4 border-b">Enrolled Course</th>
                              <th className="py-3 px-4 border-b">Faculty</th>
                              <th className="py-3 px-4 border-b text-center">Marks</th>
                              <th className="py-3 px-4 border-b text-center">Progress</th>
                              <th className="py-3 px-4 border-b text-center">Logs</th>
                           </tr>
                        </thead>
                        <tbody>
                           {flatExportData.length === 0 ? (
                              <tr>
                                 <td colSpan={9} className="py-12 text-center text-slate-500">No data matches your current filters.</td>
                              </tr>
                           ) : (
                              flatExportData.map((row, idx) => (
                                 <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4 font-medium text-slate-800">{row["Student Name"]}</td>
                                    <td className="py-3 px-4 text-slate-500">{row["Email / Roll"]}</td>
                                    <td className="py-3 px-4 text-slate-600">{row["Department"]}</td>
                                    <td className="py-3 px-4">
                                       <Badge variant={row["Status"] === "Active" ? "success" : row["Status"] === "Frozen" ? "error" : "warning"}>
                                          {row["Status"]}
                                       </Badge>
                                    </td>
                                    <td className="py-3 px-4 text-slate-700 font-medium">
                                       {row["Assigned Course"]}
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 max-w-[150px] truncate" title={row["Faculty"]}>
                                       {row["Faculty"]}
                                    </td>
                                    <td className="py-3 px-4 text-center font-bold text-emerald-600">
                                       {row["Marks Obtained"]}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                       <div className="flex flex-col items-center">
                                          <span className="font-bold text-emerald-600">{row["Progress (%)"]}</span>
                                          <span className="text-[10px] text-slate-400">({row["Tasks Matrix (Done/Total)"]})</span>
                                       </div>
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-medium text-purple-600">
                                       {row["Total Logs Submitted"]}
                                    </td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  </div>
                  <div className="mt-3 text-right text-xs text-slate-400 font-medium tracking-wide">
                     Showing {flatExportData.length} records instantly rendered.
                  </div>
               </GlassCard>
            </div>
         )}
      </div>
   );
};

export default ReportsPage;
