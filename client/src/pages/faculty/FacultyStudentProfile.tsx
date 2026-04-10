import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { facultyService } from "@/services/faculty";
import { GlassCard, Button, Badge } from "@/components/ui";
import { ArrowLeft, Mail, BookOpen, CheckCircle, Clock, ExternalLink, FileText } from "lucide-react";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const FacultyStudentProfile = () => {
  const { skillId, studentId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (skillId && studentId) {
      fetchStudentDetails(skillId, studentId);
    }
  }, [skillId, studentId]);

  const fetchStudentDetails = async (sid: string, stid: string) => {
    try {
      setLoading(true);
      const res = await facultyService.getStudentDetail(sid, stid);
      if (res.success) {
        setData(res.data);
      }
    } catch (e) {
      toast.error("Failed to load student details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
     return <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }
  
  if (!data || !data.enrollment) {
     return (
       <div className="p-10 text-center">
         <h1 className="text-2xl font-bold">Student Not Found</h1>
         <Link to="/faculty/students"><Button className="mt-4">Back to Students</Button></Link>
       </div>
     );
  }

  const { enrollment, assessments, lessonProgress } = data;
  const { student } = enrollment;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/faculty/students">
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0 rounded-full bg-white shadow-sm border border-slate-200">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Student Profile</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Student Detail Card */}
        <div className="space-y-6">
          <GlassCard variant="primary" className="p-6 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto shadow-inner mb-4">
              {student.fullName?.charAt(0) || "U"}
            </div>
            <h2 className="text-xl font-bold text-slate-800">{student.fullName}</h2>
            <p className="text-sm text-slate-500 flex items-center justify-center gap-2 mt-2">
              <Mail size={14} /> {student.email}
            </p>
            {student.rollNumber && (
              <Badge variant="purple" className="mt-4">{student.rollNumber}</Badge>
            )}
          </GlassCard>

          <GlassCard variant="primary" className="p-6">
             <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Course Metrics</h3>
             <div className="space-y-4">
                <div>
                   <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 uppercase font-semibold">Progress</span>
                      <span className="font-bold text-slate-700">{Number(enrollment.progressPercentage || 0).toFixed(0)}%</span>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <div className="h-full bg-gradient-to-r from-purple-400 to-indigo-500" style={{ width: `${enrollment.progressPercentage || 0}%` }} />
                   </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                   <span className="text-sm font-medium text-slate-600 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/> Tasks Done</span>
                   <span className="font-bold text-slate-800">{enrollment.totalTasksCompleted}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                   <span className="text-sm font-medium text-slate-600 flex items-center gap-2"><BookOpen size={14} className="text-blue-500"/> Status</span>
                   <Badge variant={enrollment.status === 'completed' ? 'success' : 'info'}>{enrollment.status}</Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                   <span className="text-sm font-medium text-slate-600 flex items-center gap-2"><Clock size={14} className="text-amber-500"/> Marks Gained</span>
                   <span className="font-bold text-emerald-600">{Number(enrollment.totalMarksObtained || 0).toFixed(1)}</span>
                </div>
             </div>
          </GlassCard>
        </div>

        {/* Right Column: Assessment Details */}
        <div className="md:col-span-2 space-y-6">
          <GlassCard variant="primary" className="p-6 min-h-[400px]">
            <h3 className="font-bold text-xl text-slate-800 mb-6">Task Submissions & Assessments</h3>
            
            {assessments?.length === 0 ? (
              <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                 <CheckCircle size={32} className="mx-auto mb-2 opacity-20" />
                 <p>No tasks submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assessments?.map((a: any) => (
                  <div key={a.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-xs font-bold px-2 py-0.5 bg-slate-200 rounded-full text-slate-600">Day {a.task?.dayNumber}</span>
                           <h4 className="font-bold text-slate-800">{a.task?.title}</h4>
                        </div>
                        <p className="text-xs text-slate-500">
                           Submitted: {new Date(a.submittedAt).toLocaleDateString()}
                        </p>
                     </div>
                      <div className="text-right flex items-center gap-3">
                        {a.submissionUrl && (
                          <a 
                            href={a.submissionUrl.startsWith('http') ? a.submissionUrl : `${API_URL}${a.submissionUrl}`} 
                            target="_blank" 
                            rel="noreferrer"
                          >
                            <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2">
                              <ExternalLink size={14} /> Submission
                            </Button>
                          </a>
                        )}
                        {a.assessedAt ? (
                          <div className="min-w-[60px]">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Marks</p>
                            <p className="text-lg font-bold text-emerald-600 border-b border-emerald-200">
                              {Number(a.marksObtained).toFixed(1)} <span className="text-xs text-slate-400">/ {Number(a.task?.maxMarks).toFixed(1)}</span>
                            </p>
                          </div>
                        ) : (
                          <Badge variant="warning">Pending Grading</Badge>
                        )}
                        <Link to={`/faculty/assessments/${a.id}`}>
                          <Button size="sm" variant="outline" className="bg-white hover:bg-slate-50 border-slate-200">View Evaluation</Button>
                        </Link>
                      </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard variant="secondary" className="p-6">
            <h3 className="font-bold text-xl text-slate-800 mb-4">Lessons Watched</h3>
            {lessonProgress?.length === 0 ? (
               <p className="text-slate-500 italic text-sm">No lessons watched yet.</p>
            ) : (
               <div className="flex flex-wrap gap-2">
                 {lessonProgress?.map((lp: any) => (
                    <Badge key={lp.id} variant="purple">{lp.lesson?.title}</Badge>
                 ))}
               </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default FacultyStudentProfile;
