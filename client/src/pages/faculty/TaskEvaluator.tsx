import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { facultyService } from "@/services/faculty";
import api from "@/services/api";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
  Badge,
  Button,
} from "@/components/ui";
import { Download, CheckCircle, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

const TaskEvaluator = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form
  const [rubricScores, setRubricScores] = useState<any[]>([]);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetchAssessment();
  }, [assessmentId]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      const res = await facultyService.getAssessmentDetail(assessmentId as string);
      if (res.success) {
        setAssessment(res.data);
        if (res.data.rubrics && !res.data.rubricScores) {
           // initialize scores array matching rubrics
           setRubricScores(res.data.task.rubrics.map((r: any) => ({ criterion: r.criterion, score: 0 })));
        } else if (res.data.rubricScores) {
           setRubricScores(res.data.rubricScores);
           setFeedback(res.data.facultyFeedback || "");
        }
      }
    } catch (error: any) {
      toast.error("Failed to load assessment details");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (index: number, score: number) => {
    const updated = [...rubricScores];
    updated[index].score = score;
    setRubricScores(updated);
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessment) return;

    try {
      const toastId = toast.loading("Submitting evaluation...");
      // There's no separate facultyService endpoint implemented in my file for this, I'll call api directly
      const payload = {
         marksObtained: rubricScores.reduce((sum, r) => sum + r.score, 0),
         rubricScores: rubricScores,
         feedback: feedback
      };
      
      await api.post(`/faculty/assessments/${assessmentId}/evaluate`, payload);
      
      toast.dismiss(toastId);
      toast.success("Assessment evaluated successfully!");
      navigate("/faculty/assessments");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to submit evaluation");
    }
  };

  if (loading) return <p className="mt-8 text-center text-slate-500">Loading evaluation...</p>;
  if (!assessment) return <p className="mt-8 text-center text-red-500">Assessment not found</p>;

  const totalObtained = rubricScores.reduce((sum, r) => sum + (r.score || 0), 0);
  const isEvaluated = !!assessment.assessedAt;

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate("/faculty/assessments")} className="mb-4">
          Back to Gradebook
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              Evaluate: {assessment.task.title}
            </h1>
            <p className="text-slate-500 mt-1">Student: {assessment.student.fullName} ({assessment.student.rollNumber})</p>
          </div>
          <Badge variant={isEvaluated ? "success" : "warning"}>{isEvaluated ? "Graded" : "Needs Grading"}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* SUBMISSION SIDE */}
         <div className="space-y-6">
            <GlassCard variant="secondary">
               <GlassCardHeader title="Student Submission" />
               <GlassCardContent>
                  {assessment.isLate && <Badge variant="warning" className="mb-4">Submitted Late</Badge>}
                  
                  {assessment.submissionText && (
                    <div className="mb-6">
                       <h4 className="font-semibold text-slate-700 text-sm mb-2">Text Response</h4>
                       <div className="p-4 bg-white/50 rounded-xl whitespace-pre-wrap text-slate-600 text-sm border border-slate-100">
                         {assessment.submissionText}
                       </div>
                    </div>
                  )}

                  {assessment.submissionFileUrl && (
                     <div>
                       <h4 className="font-semibold text-slate-700 text-sm mb-2">Attached File</h4>
                       <a 
                         href={import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}${assessment.submissionFileUrl}` : assessment.submissionFileUrl} 
                         target="_blank" 
                         rel="noreferrer"
                         className="flex items-center gap-2 p-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition inline-flex font-medium text-sm border border-purple-200"
                       >
                         <Download size={18} />
                         Download File
                       </a>
                     </div>
                  )}

                  {!assessment.submissionText && !assessment.submissionFileUrl && (
                     <p className="text-slate-500 italic text-sm">No submission data provided</p>
                  )}
               </GlassCardContent>
            </GlassCard>
            
            <GlassCard variant="secondary">
               <GlassCardContent>
                  <h4 className="font-semibold text-slate-700 text-sm mb-2">Task Description</h4>
                  <p className="text-sm text-slate-600">{assessment.task.description}</p>
               </GlassCardContent>
            </GlassCard>
         </div>

         {/* EVALUATION SIDE */}
         <div>
            <GlassCard variant="secondary">
               <GlassCardHeader title="Grading Rubric" />
               <GlassCardContent>
                  <form onSubmit={handleSubmitEvaluation}>
                     <div className="space-y-4 mb-6">
                       {assessment.task.rubrics && assessment.task.rubrics.map((rubric: any, index: number) => (
                         <div key={index} className="flex justify-between items-center p-4 bg-white/60 rounded-xl border border-white/40 shadow-sm">
                           <div>
                              <p className="font-medium text-slate-800">{rubric.criterion}</p>
                              <p className="text-xs text-slate-500">Max Marks: {rubric.maxMarks}</p>
                           </div>
                           <div className="flex items-center gap-2">
                             <input 
                               type="number" 
                               min="0" 
                               max={rubric.maxMarks} 
                               step="0.5"
                               required
                               disabled={isEvaluated}
                               className="w-20 px-3 py-2 rounded-lg border text-center focus:ring-2 focus:ring-purple-500 outline-none"
                               value={rubricScores[index]?.score || ""}
                               onChange={(e) => handleScoreChange(index, parseFloat(e.target.value) || 0)}
                             />
                             <span className="text-slate-400">/ {rubric.maxMarks}</span>
                           </div>
                         </div>
                       ))}
                     </div>

                     <div className="flex justify-between items-center p-4 bg-slate-800 rounded-xl text-white mb-6">
                        <span className="font-semibold">Total Obtained</span>
                        <span className="text-2xl font-bold">{totalObtained} <span className="text-slate-400 text-lg">/ {assessment.task.maxMarks}</span></span>
                     </div>

                     <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Faculty Feedback</label>
                        <textarea 
                           rows={4}
                           required
                           disabled={isEvaluated}
                           className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                           placeholder="Provide constructive feedback for the student..."
                           value={feedback}
                           onChange={(e) => setFeedback(e.target.value)}
                        />
                     </div>

                     {!isEvaluated && (
                        <Button type="submit" variant="primary" className="w-full" leftIcon={<CheckCircle size={18} />}>
                           Submit Final Grade
                        </Button>
                     )}
                     {isEvaluated && (
                        <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center justify-center gap-2 font-medium">
                           <CheckCircle size={18} />
                           Assessed by {assessment.assessedBy?.fullName} on {new Date(assessment.assessedAt).toLocaleDateString()}
                        </div>
                     )}
                  </form>
               </GlassCardContent>
            </GlassCard>
         </div>
      </div>
    </div>
  );
};

export default TaskEvaluator;
