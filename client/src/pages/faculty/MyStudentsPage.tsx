import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { facultyService } from "@/services/faculty";
import {
  GlassCard,
  Button,
  StatsCard,
  Badge
} from "@/components/ui";
import { GraduationCap, BookOpen, Clock, TrendingUp, ChevronRight, ChevronDown, User } from "lucide-react";
import toast from "react-hot-toast";
import { socketService } from "@/services/socket";

const MyStudentsPage = () => {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for accordions
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [skillStudents, setSkillStudents] = useState<Record<string, { loading: boolean; data: any[] }>>({});
  
  // State for student details expansion
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<Record<string, { loading: boolean; data: any }>>({});

  useEffect(() => {
    fetchSkills();
    
    // Setup socket listeners
    const handleSkillUpdate = (update: any) => {
      if (update.type === "progress_updated") {
        const { studentId, progress, totalMarks, tasksCompleted } = update.data;
        
        // Find and update the student in skillStudents
        setSkillStudents(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(sId => {
            newState[sId].data = newState[sId].data.map((enrollment: any) => {
              if (enrollment.studentId === studentId) {
                return {
                  ...enrollment,
                  progressPercentage: progress,
                  totalMarksObtained: totalMarks,
                  totalTasksCompleted: tasksCompleted
                };
              }
              return enrollment;
            });
          });
          return newState;
        });

        // If the student details are expanded, we should probably fetch them again or update them
        // But for now, just updating the list is a big win for "real-time"
      }
    };

    socketService.socket?.on("skill:update", handleSkillUpdate);

    return () => {
      socketService.socket?.off("skill:update", handleSkillUpdate);
    };
  }, [socketService.socket]);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const res = await facultyService.getMySkills();
      if (res.success) {
        setSkills(res.data || []);
      }
    } catch (e) {
      toast.error("Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentDetails = async (skillId: string, studentId: string) => {
    if (expandedStudentId === studentId) {
      setExpandedStudentId(null);
      return;
    }

    setExpandedStudentId(studentId);

    if (!studentDetails[studentId]) {
      try {
        setStudentDetails(prev => ({ ...prev, [studentId]: { loading: true, data: null } }));
        const res = await facultyService.getStudentDetail(skillId, studentId);
        if (res.success) {
          setStudentDetails(prev => ({ 
            ...prev, 
            [studentId]: { loading: false, data: res.data } 
          }));
        }
      } catch (e) {
        toast.error("Failed to load student details");
        setStudentDetails(prev => ({ ...prev, [studentId]: { loading: false, data: null } }));
      }
    }
  };

  const toggleAccordion = async (skillId: string) => {
    // If clicking the same one, just close it
    if (expandedSkillId === skillId) {
      socketService.emit("leave:skill", skillId);
      setExpandedSkillId(null);
      return;
    }
    
    // If another is open, leave its room first
    if (expandedSkillId) {
      socketService.emit("leave:skill", expandedSkillId);
    }
    
    setExpandedSkillId(skillId);
    socketService.emit("join:skill", skillId);
    
    // Fetch students for this skill if not already fetched
    if (!skillStudents[skillId]) {
      try {
        setSkillStudents(prev => ({ ...prev, [skillId]: { loading: true, data: [] } }));
        const res = await facultyService.getSkillStudents(skillId, { limit: 100 });
        if (res.success) {
          setSkillStudents(prev => ({ 
            ...prev, 
            [skillId]: { loading: false, data: res.data.items } 
          }));
        }
      } catch (e) {
        toast.error("Failed to load students for this skill");
        setSkillStudents(prev => ({ ...prev, [skillId]: { loading: false, data: [] } }));
      }
    }
  };

  // Calculate aggregates
  const totalStudents = (skills || []).reduce((acc, sf) => acc + (sf?.skill?._count?.studentSkills || 0), 0);
  const totalCourses = (skills || []).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
          My Students
        </h1>
        <p className="text-slate-500 mt-1">Track progress and performance of students enrolled in your skills.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatsCard title="Total Assigned Students" value={totalStudents} icon={<GraduationCap size={20} />} accentColor="purple" />
         <StatsCard title="Total Assigned Courses" value={totalCourses} icon={<BookOpen size={20} />} accentColor="blue" />
         {/* Stubbed data for UI aesthetic below currently */}
         <StatsCard title="Pending Graded" value="-" icon={<Clock size={20} />} accentColor="orange" />
         <StatsCard title="Completed Output" value="-" icon={<TrendingUp size={20} />} accentColor="green" />
      </div>

      <div className="space-y-4">
        {loading ? (
           <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (skills || []).length === 0 ? (
          <GlassCard variant="card" padding="lg">
             <div className="text-center text-slate-500 py-10">
                <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
                You have no assigned skills yet.
             </div>
          </GlassCard>
        ) : (
          (skills || []).map((sf) => (
            <GlassCard key={sf.id} variant="primary" className="overflow-hidden">
               {/* Accordion Header */}
               <div 
                 className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/40 transition-colors"
                 onClick={() => toggleAccordion(sf.id)}
               >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-inner pb-1">
                      {sf?.skillCode?.substring(0, 2) || "SK"}
                    </div>
                    <div>
                       <h3 className="font-bold text-lg text-slate-800">{sf?.name || "Untitled Skill"}</h3>
                       <div className="flex gap-2 mt-1 items-center">
                          <Badge variant="purple">{sf?.skillCode || "N/A"}</Badge>
                          <span className="text-sm text-slate-500">{sf?._count?.studentSkills || 0} Students Enrolled</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center text-slate-400">
                    {expandedSkillId === sf.id ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                 </div>
               </div>

               {/* Accordion Body */}
               {expandedSkillId === sf.id && (
                 <div className="border-t border-slate-200/50 bg-slate-50/50 p-6">
                    {skillStudents[sf.id]?.loading ? (
                      <div className="py-8 text-center text-slate-500 animate-pulse">Loading students...</div>
                    ) : skillStudents[sf.id]?.data?.length === 0 ? (
                      <div className="py-8 text-center text-slate-500">
                         <GraduationCap size={32} className="mx-auto mb-2 opacity-20" />
                         No students currently enrolled in this course.
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {skillStudents[sf.id]?.data?.map((enrollment: any) => (
                          <div key={enrollment.studentId} className="bg-white/80 border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div 
                                className="flex items-center gap-3 w-full md:max-w-xs cursor-pointer"
                                onClick={() => toggleStudentDetails(sf.id, enrollment.studentId)}
                              >
                                 <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                                    {enrollment.student?.fullName?.charAt(0) || "U"}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 text-sm truncate">{enrollment.student?.fullName}</h4>
                                    <p className="text-xs text-slate-500 truncate">{enrollment.student?.email}</p>
                                 </div>
                                 <div className="md:hidden text-slate-400">
                                   {expandedStudentId === enrollment.studentId ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                 </div>
                              </div>
                              
                              <div className="flex-1 w-full md:max-w-sm">
                                 <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-500">Course Progress</span>
                                    <span className="font-bold text-slate-700">{Number(enrollment.progressPercentage || 0).toFixed(0)}%</span>
                                 </div>
                                 <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                    <div className={`h-full bg-gradient-to-r ${Number(enrollment.progressPercentage) >= 80 ? 'from-green-400 to-emerald-500' : 'from-purple-400 to-indigo-500'}`} style={{ width: `${enrollment.progressPercentage || 0}%` }} />
                                 </div>
                                 <div className="mt-1 text-[10px] text-slate-500 text-right">
                                   {enrollment.totalTasksCompleted} tasks completed
                                 </div>
                              </div>

                              <div className="flex items-center gap-6 justify-between w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t border-slate-100 md:border-0 px-2 md:px-0">
                                 <div className="text-right">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Marks</p>
                                    <p className="text-sm font-bold text-emerald-600">{Number(enrollment.totalMarksObtained || 0).toFixed(1)} <span className="text-[10px] text-slate-400">Pts</span></p>
                                 </div>
                                 <div className="flex gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="hidden md:flex text-slate-500 h-9"
                                    onClick={() => toggleStudentDetails(sf.id, enrollment.studentId)}
                                  >
                                    {expandedStudentId === enrollment.studentId ? <ChevronDown size={18} className="mr-1" /> : <ChevronRight size={18} className="mr-1" />}
                                    Status
                                  </Button>
                                  <Link to={`/faculty/skills/${sf.id}/students/${enrollment.studentId}`}>
                                    <Button variant="outline" size="sm" className="bg-white h-9">
                                      <User size={14} className="mr-2" /> Details
                                    </Button>
                                  </Link>
                                 </div>
                              </div>
                            </div>

                            {/* Student Status Expansion (The "Things There" part) */}
                            {expandedStudentId === enrollment.studentId && (
                              <div className="border-t border-slate-100 bg-slate-50/30 p-4">
                                {studentDetails[enrollment.studentId]?.loading ? (
                                  <div className="py-4 text-center text-xs text-slate-400">Fetching task status...</div>
                                ) : (
                                  <div className="space-y-4">
                                    {/* Task Status Summary */}
                                    <div>
                                      <h5 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Practical Tasks & Submissions</h5>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {studentDetails[enrollment.studentId]?.data?.assessments?.length === 0 ? (
                                          <p className="text-xs text-slate-400 italic">No tasks submitted yet</p>
                                        ) : (
                                          studentDetails[enrollment.studentId]?.data?.assessments?.slice(0, 6).map((a: any) => (
                                            <div key={a.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 text-[11px]">
                                              <span className="font-medium text-slate-700 truncate mr-2">Day {a.task?.dayNumber}: {a.task?.title}</span>
                                              {a.assessedAt ? (
                                                <span className="font-bold text-emerald-600 whitespace-nowrap">{Number(a.marksObtained).toFixed(1)} / {a.task?.maxMarks}</span>
                                              ) : (
                                                <span className="text-orange-500 font-semibold whitespace-nowrap">Pending</span>
                                              )}
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      {/* MCQ Results */}
                                      <div>
                                        <h5 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">MCQ Performance</h5>
                                        <div className="flex items-center gap-2">
                                          <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">
                                            {studentDetails[enrollment.studentId]?.data?.assessments?.filter((a: any) => a.type === 'MCQ').length || 0} Attempts
                                          </div>
                                          <p className="text-[10px] text-slate-500">View profile for detailed breakdown</p>
                                        </div>
                                      </div>

                                      {/* Lesson Progress */}
                                      <div>
                                        <h5 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Lesson Engagement</h5>
                                        <div className="flex items-center gap-2">
                                          <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                                            {studentDetails[enrollment.studentId]?.data?.lessonProgress?.length || 0} Lessons Watched
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
               )}
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
};

export default MyStudentsPage;
