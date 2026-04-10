import { useEffect, useState } from "react";
import { GlassCard, Badge, Button } from "@/components/ui";
import { studentService } from "@/services/student";
import { CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { socketService } from "@/services/socket";
import { useNavigate } from "react-router-dom";

export default function StudentTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();

    const handleSocketEvent = (data: any) => {
      if (data?.type === "task_added" || data?.type === "skill:update") {
        fetchTasks();
      }
    };

    socketService.socket?.on("skill:update", handleSocketEvent);

    return () => {
      socketService.socket?.off("skill:update", handleSocketEvent);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await studentService.getDashboard(); 
      if (res.success) {
        setTasks(res.data.pendingTasks || []);
      }
    } catch (e) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
          My Tasks
        </h1>
        <p className="text-slate-500 mt-1">Track and submit your skill assessments.</p>
      </div>

      <GlassCard variant="secondary" padding="lg">
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <p className="text-xl font-semibold text-slate-700">All caught up!</p>
              <p className="text-slate-500">No pending tasks found for your enrolled skills.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div 
                key={task.id} 
                className="p-4 bg-white/40 rounded-xl flex items-start justify-between hover:bg-white/60 transition-all shadow-sm border border-white/50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full flex-shrink-0 bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg mt-0.5">
                    {task.dayNumber}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 text-lg leading-tight">{task.title}</h3>
                    <p className="text-sm text-slate-600 font-medium mt-1">{task.skill?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <Badge variant="purple" className="flex-shrink-0">{task.maxMarks} Marks</Badge>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => navigate(`/student/tasks/${task.id}`)}
                  >
                    Submit Task
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}
