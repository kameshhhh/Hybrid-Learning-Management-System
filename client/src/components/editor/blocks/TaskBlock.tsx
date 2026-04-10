import React, { useState, useEffect } from 'react';
import { ClipboardList, Upload, CheckCircle, Clock, FileText, Download, Search, Link as LinkIcon, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentService } from '@/services/student';
import { facultyService } from '@/services/faculty';
import { Button } from '@/components/ui';

interface TaskBlockProps {
  id: string;
  content: {
    taskId?: string;
    title?: string;
    description?: string;
  };
  isEditable?: boolean;
  isStudent?: boolean;
  onUpdate?: (content: any) => void;
  onComplete?: () => void;
  skillId?: string;
}

export const TaskBlock: React.FC<TaskBlockProps> = ({
  id,
  content,
  isEditable,
  isStudent,
  onUpdate,
  onComplete,
  skillId,
}) => {
  const [taskData, setTaskData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fileSubmission, setFileSubmission] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Editor State
  const [facultyTasks, setFacultyTasks] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isStudent && content.taskId) {
      fetchTaskDetails();
    }
  }, [isStudent, content.taskId]);

  useEffect(() => {
    if (isEditable) {
      loadFacultyTasks();
    }
  }, [isEditable]);

  const loadFacultyTasks = async () => {
    try {
      const res = await facultyService.getAllTasks();
      if (res.success) {
        setFacultyTasks(res.data);
      }
    } catch (e) {
      console.error("Failed to load faculty tasks");
    }
  };

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const res = await studentService.getTaskDetails(content.taskId!, skillId);
      if (res.success) {
        setTaskData(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch task details", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTask = (task: any) => {
    onUpdate?.({
      ...content,
      taskId: task.id,
      title: task.title,
      description: task.description || ''
    });
    setShowPicker(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileSubmission(file);
  };

  const handleSubmit = async () => {
    if (!fileSubmission || !content.taskId) return;

    try {
      setIsSubmitting(true);
      const toastId = toast.loading("Submitting task...");

      await studentService.submitTask(content.taskId, {
        file: fileSubmission,
        skillId
      });

      toast.success("Task submitted successfully!", { id: toastId });
      fetchTaskDetails();
      onComplete?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditable) {
    const filteredSkills = facultyTasks.map(sf => ({
      ...sf,
      tasks: sf.tasks.filter((t: any) => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sf.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.dayNumber.toString().includes(searchQuery)
      )
    })).filter(sf => sf.tasks.length > 0);

    return (
      <div className="p-6 bg-white rounded-3xl border border-dashed border-slate-300 group hover:border-purple-400 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <ClipboardList size={20} />
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Task Block Title"
                value={content.title || ''}
                onChange={(e) => onUpdate?.({ ...content, title: e.target.value })}
                className="w-full text-lg font-bold bg-transparent border-none outline-none focus:ring-0 p-0"
              />
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowPicker(!showPicker)}
            className="rounded-xl text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-100"
            leftIcon={<LinkIcon size={12} />}
          >
            {showPicker ? 'Close Picker' : 'Link Task Block'}
          </Button>
        </div>

        {showPicker && (
          <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text"
                placeholder="Search by task title or course name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border-none text-xs focus:ring-2 focus:ring-purple-500 shadow-sm"
              />
            </div>
            
            <div className="max-h-[250px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {filteredSkills.map(sf => (
                <div key={sf.skillId}>
                  <p className="px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{sf.skillName}</p>
                  <div className="space-y-1">
                    {sf.tasks.map((task: any) => (
                      <button
                        key={task.id}
                        onClick={() => handleSelectTask(task)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group ${
                          content.taskId === task.id ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-white text-slate-600'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-xs font-bold truncate">Day {task.dayNumber}: {task.title}</p>
                          <p className={`text-[9px] ${content.taskId === task.id ? 'text-purple-200' : 'text-slate-400'}`}>ID: ...{task.id.slice(-8)}</p>
                        </div>
                        <ExternalLink size={12} className={content.taskId === task.id ? 'text-white' : 'opacity-0 group-hover:opacity-100 text-slate-400'} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {filteredSkills.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  No tasks found matching your search.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 block">Database Connection (Task ID)</label>
            <input
              type="text"
              placeholder="Enter Task UUID or Friendly Name"
              value={content.taskId || ''}
              onChange={(e) => onUpdate?.({ ...content, taskId: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm font-mono focus:ring-1 focus:ring-purple-500 outline-none"
            />
            <p className="mt-1.5 text-[10px] text-slate-500 italic">
              Use the <strong>"Link Task Block"</strong> button above to connect this to a real database task.
            </p>
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 block">Student Instructions</label>
            <textarea
              placeholder="What should the student do? Provide clear, step-by-step instructions..."
              value={content.description || ''}
              onChange={(e) => onUpdate?.({ ...content, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm min-h-[120px] focus:ring-1 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-100 animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-slate-100" />
        <div className="h-4 w-48 bg-slate-100 rounded" />
      </div>
    );
  }

  const { task, submission } = taskData || {};
  const isEvaluated = submission?.status === "evaluated";

  return (
    <div className="my-8">
      <div className="overflow-hidden bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <ClipboardList size={24} />
              <h3 className="text-xl font-bold">{content.title || task?.title || "Practical Task"}</h3>
            </div>
            {submission ? (
              <div className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isEvaluated ? 'bg-green-500/20 text-green-100' : 'bg-blue-500/20 text-blue-100'
                }`}>
                {isEvaluated ? <CheckCircle size={12} /> : <Clock size={12} />}
                {isEvaluated ? 'Evaluated' : 'Under Review'}
              </div>
            ) : (
              <div className="px-4 py-1 rounded-full bg-orange-500/20 text-orange-100 text-[10px] font-bold uppercase tracking-widest">
                Action Required
              </div>
            )}
          </div>
          <p className="text-purple-100 text-sm opacity-90 leading-relaxed">
            {(content.description || task?.description || "Select a file and click submit to turn in your work.")
              .split('\n').map((line: string, i: number) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))}
          </p>
        </div>

        <div className="p-8 space-y-6">
          {isEvaluated ? (
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-green-800 uppercase tracking-wide">Result</span>
                <span className="text-2xl font-black text-green-600">
                  {submission.marksObtained} <span className="text-sm font-medium opacity-60">/ {task.maxMarks}</span>
                </span>
              </div>
              {submission.feedback && (
                <p className="text-sm text-green-700 bg-white/50 p-4 rounded-xl italic">
                  "{submission.feedback}"
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="file"
                    id={`task-upload-${id}`}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <label
                    htmlFor={`task-upload-${id}`}
                    className="flex items-center justify-between px-6 py-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-slate-400 group-hover:text-purple-500" />
                      <span className="text-sm font-medium text-slate-600 group-hover:text-purple-700">
                        {fileSubmission ? fileSubmission.name : (submission?.fileUrl ? "Update Current File" : "Choose File...")}
                      </span>
                    </div>
                    <Upload size={18} className="text-slate-300 group-hover:text-purple-400" />
                  </label>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!fileSubmission || isSubmitting}
                  className="h-[56px] px-8 rounded-2xl shadow-lg shadow-purple-200"
                >
                  {isSubmitting ? "Submitting..." : "Submit Task"}
                </Button>
              </div>

              {submission?.fileUrl && (
                <div className="flex justify-end pr-2">
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-purple-600 flex items-center gap-1"
                  >
                    <Download size={10} /> View Last Submission
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
