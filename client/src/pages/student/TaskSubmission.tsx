import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { studentService } from "@/services/student";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
  Badge,
  Button
} from "@/components/ui";
import { ArrowLeft, CheckCircle, Upload } from "lucide-react";
import toast from "react-hot-toast";

const TaskSubmission = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [taskData, setTaskData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [textSubmission, setTextSubmission] = useState("");
  const [fileSubmission, setFileSubmission] = useState<File | null>(null);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const res = await studentService.getTaskDetails(taskId as string);
      if (res.success) {
        setTaskData(res.data);
        if (res.data.submission?.submissionText) setTextSubmission(res.data.submission.submissionText);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to load task");
      navigate("/student/skills");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskData) return;
    
    // Validation based on type
    const t = taskData.task.submissionType;
    if (t === "text" && !textSubmission) return toast.error("Text submission is required");
    if (t === "file" && !fileSubmission && !taskData.submission?.submissionFileUrl) return toast.error("File is required");
    if (t === "both" && (!textSubmission || (!fileSubmission && !taskData.submission?.submissionFileUrl))) return toast.error("Both file and text are required");

    try {
      const toastId = toast.loading("Submitting task...");
      await studentService.submitTask(taskId as string, {
         submissionText: textSubmission,
         ...(fileSubmission ? { file: fileSubmission } : {})
      });
      toast.success("Task submitted successfully!", { id: toastId });
      fetchTask(); // re-fetch to get new status
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Submission failed");
    }
  };

  if (loading) return <p className="mt-8 text-center text-slate-500">Loading task...</p>;
  if (!taskData) return null;

  const { task, submission } = taskData;
  const isEvaluated = submission?.status === "evaluated";

  return (
    <div className="space-y-6">
       <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate(-1)} className="mb-4">
          Back
       </Button>

       <div className="flex justify-between items-start">
         <div>
           <Badge variant="purple" className="mb-2">{task.skillName} • {task.chapterTitle}</Badge>
           <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
             Task {task.dayNumber}: {task.title}
           </h1>
         </div>
         <Badge variant={isEvaluated ? "success" : submission ? "info" : "warning"}>
            {isEvaluated ? `Evaluated: ${submission.marksObtained}/${task.maxMarks}` : submission ? "Submitted - Pending Grade" : "Not Submitted"}
         </Badge>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard variant="secondary">
            <GlassCardHeader title="Task Details" />
            <GlassCardContent>
               <p className="text-slate-600 mb-6">{task.description}</p>
               
               <div className="bg-white/50 p-4 rounded-xl border border-white/60 mb-6">
                  <h4 className="font-semibold text-slate-800 mb-2">Grading Criteria</h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                    {task.rubrics?.map((r: any, idx: number) => (
                      <li key={idx}>{r.criterion} (Max: {r.maxMarks})</li>
                    ))}
                  </ul>
               </div>
               
               {isEvaluated && submission.feedback && (
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                     <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                        <CheckCircle size={18} /> Faculty Feedback
                     </h4>
                     <p className="text-green-700 text-sm">{submission.feedback}</p>
                  </div>
               )}
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="secondary">
            <GlassCardHeader title="Your Submission" />
            <GlassCardContent>
               <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {(task.submissionType === "text" || task.submissionType === "both") && (
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-2">Text Output</label>
                       <textarea 
                          rows={6}
                          disabled={isEvaluated}
                          required
                          value={textSubmission}
                          onChange={(e) => setTextSubmission(e.target.value)}
                          placeholder="Type your answer or paste your code here..."
                          className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50"
                       />
                     </div>
                  )}

                  {(task.submissionType === "file" || task.submissionType === "both") && (
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">File Attachment</label>
                        {submission?.submissionFileUrl && (
                           <div className="p-3 mb-2 bg-purple-50 text-purple-700 rounded-lg text-sm flex justify-between items-center">
                              <span>Existing file attached</span>
                              <a href={(submission.submissionFileUrl && submission.submissionFileUrl.startsWith('/')) ? `${import.meta.env.VITE_API_URL || ''}${submission.submissionFileUrl}` : (submission.submissionFileUrl || '#')} target="_blank" className="font-medium hover:underline">Download</a>
                           </div>
                        )}
                        {!isEvaluated && (
                           <div className="flex items-center justify-center w-full">
                              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-white/50 hover:bg-slate-50">
                                 <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                       <Upload className="w-8 h-8 mb-3 text-slate-400" />
                                       <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                       <p className="text-xs text-slate-500">ZIP, PDF (Max 25MB)</p>
                                       {fileSubmission && <p className="mt-2 font-medium text-purple-600">{fileSubmission.name}</p>}
                                 </div>
                                 <input id="dropzone-file" type="file" className="hidden" accept=".zip,.pdf" onChange={e => setFileSubmission(e.target.files?.[0] || null)} />
                              </label>
                           </div>
                        )}
                     </div>
                  )}

                  <div className="pt-4 flex justify-end">
                     {!isEvaluated ? (
                        <Button type="submit" variant="primary">
                           {submission ? "Resubmit Task" : "Submit Task"}
                        </Button>
                     ) : (
                        <p className="text-sm text-slate-500 italic">This task has been graded and cannot be resubmitted.</p>
                     )}
                  </div>
               </form>
            </GlassCardContent>
          </GlassCard>
       </div>
    </div>
  );
};

export default TaskSubmission;
