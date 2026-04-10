// ============================================================
// STUDENT DASHBOARD PAGE
// ============================================================
//
// Main dashboard view for students showing:
// - Enrolled skills with progress
// - Pending tasks to complete
// - Recent grades received
// - Overall learning statistics
//
// Uses the Velox glassmorphism design system.
// ============================================================

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GlassCard, StatsCard, Badge, Button } from "@/components/ui";
import api from "@/services/api";
import { socketService } from "@/services/socket";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Trophy,
  Play,
  ChevronRight,
  Star,
  Target,
  Award,
  TrendingUp,
} from "lucide-react";

// ===================
// TYPE DEFINITIONS
// ===================

interface EnrolledSkill {
  skill: {
    id: string;
    name: string;
    skillCode: string;
    thumbnailUrl?: string;
    totalTasks: number;
    totalChapters: number;
    totalLessons: number;
  };
  progress: {
    tasksCompleted: number;
    marksObtained: number;
    percentage: number;
  };
}

interface PendingTask {
  id: string;
  title: string;
  dayNumber: number;
  maxMarks: number;
  skill: { name: string };
}

interface RecentGrade {
  id: string;
  marksObtained: number;
  assessedAt: string;
  task: { title: string; maxMarks: number };
  skill: { name: string };
}

interface DashboardData {
  enrollments: EnrolledSkill[];
  recentGrades: RecentGrade[];
  pendingTasks: PendingTask[];
  stats: {
    activeSkills: number;
    completedSkills: number;
    pendingTasks: number;
    totalCertificates: number;
    completedTasks: number;
  };
}

// ===================
// STUDENT DASHBOARD COMPONENT
// ===================

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===================
  // DATA FETCHING
  // ===================

  useEffect(() => {
    fetchDashboardData();

    const handleSocketEvent = (data: any) => {
      if (data?.type === "grade_updated" || data?.type === "skill:update") {
        fetchDashboardData();
      }
    };

    socketService.socket?.on("notification", handleSocketEvent);
    socketService.socket?.on("skill:update", handleSocketEvent);

    return () => {
      socketService.socket?.off("notification", handleSocketEvent);
      socketService.socket?.off("skill:update", handleSocketEvent);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/student/dashboard");
      setData(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || "Failed to load dashboard",
      );
      setError(
        err.response?.data?.error?.message || "Failed to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================
  // RENDER HELPERS
  // ===================

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return "from-green-500 to-emerald-500";
    if (percentage >= 50) return "from-blue-500 to-cyan-500";
    if (percentage >= 25) return "from-amber-500 to-orange-500";
    return "from-purple-500 to-pink-500";
  };

  // ===================
  // LOADING STATE
  // ===================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  // ===================
  // MAIN RENDER
  // ===================

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-gradient text-3xl font-bold mb-2">
          Welcome back! 👋
        </h1>
        <p className="text-slate-600">
          Track your progress and continue learning
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Enrolled Skills"
          value={data?.stats?.activeSkills || 0}
          icon={<BookOpen className="w-6 h-6" />}
          color="purple"
        />
        <StatsCard
          title="Completed Tasks"
          value={data?.stats?.completedTasks || 0}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
        <StatsCard
          title="Available Certificates"
          value={data?.stats?.totalCertificates || 0}
          icon={<Award className="w-6 h-6" />}
          color="amber"
        />
        <StatsCard
          title="Pending Tasks"
          value={data?.pendingTasks?.length || 0}
          icon={<Clock className="w-6 h-6" />}
          color="blue"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continue Learning - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enrolled Skills */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                My Skills
              </h2>
              <Link
                to="/student/skills"
                className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {data?.enrollments?.map((enrollment) => (
                <div
                  key={enrollment.skill.id}
                  className="p-4 bg-white/40 rounded-xl hover:bg-white/60 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {enrollment.skill.name}
                      </h3>
                      <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                        <Badge variant="secondary" size="sm">
                          {enrollment.skill.skillCode}
                        </Badge>
                        <span>{enrollment.skill.totalLessons} lessons</span>
                        <span>•</span>
                        <span>{enrollment.skill.totalTasks} tasks</span>
                      </p>
                    </div>
                    <Button size="sm" onClick={() => navigate(`/student/skills/${enrollment.skill.id}`)}>
                      <Play className="w-4 h-4 mr-1" />
                      Continue
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600">
                        {enrollment.progress.tasksCompleted}/
                        {enrollment.skill.totalTasks} tasks
                      </span>
                      <span className="font-medium text-slate-800">
                        {enrollment.progress.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(enrollment.progress.percentage)} transition-all duration-500`}
                        style={{ width: `${enrollment.progress.percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200/50 text-sm">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      {enrollment.progress.marksObtained} marks
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Pending Tasks */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Pending Tasks
              </h2>
            </div>

            {data?.pendingTasks && data.pendingTasks.length > 0 ? (
              <div className="space-y-3">
                {data.pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between p-4 bg-white/40 rounded-xl hover:bg-white/60 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold shadow-sm mt-0.5">
                        {task.dayNumber}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 leading-snug">
                          {task.title}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {task.skill.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge variant="info" className="flex-shrink-0">{task.maxMarks} marks</Badge>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/student/tasks/${task.id}`)}>
                        Start
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">No pending tasks</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Recent Grades */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Recent Grades
            </h2>

            {data?.recentGrades && data.recentGrades.length > 0 ? (
              <div className="space-y-4">
                {data.recentGrades.map((grade) => (
                  <div key={grade.id} className="p-3 bg-white/40 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-800 text-sm truncate max-w-[150px]">
                        {grade.task.title}
                      </span>
                      <Badge
                        variant={
                          grade.marksObtained >= 8
                            ? "success"
                            : grade.marksObtained >= 5
                              ? "info"
                              : "warning"
                        }
                      >
                        {grade.marksObtained}/{grade.task.maxMarks}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">{grade.skill.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatRelativeTime(grade.assessedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Star className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No grades yet</p>
              </div>
            )}

            <Link
              to="/student/grades"
              className="block text-center mt-4 text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              View All Grades
            </Link>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Quick Actions
            </h2>

            <div className="space-y-3">
              <Link
                to="/student/skills"
                className="flex items-center gap-3 p-3 bg-white/40 rounded-xl hover:bg-white/60 transition-all"
              >
                <BookOpen className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-slate-700">
                  Browse Skills
                </span>
              </Link>

              <Link
                to="/student/certificates"
                className="flex items-center gap-3 p-3 bg-white/40 rounded-xl hover:bg-white/60 transition-all"
              >
                <Award className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium text-slate-700">
                  My Certificates
                </span>
              </Link>

              <Link
                to="/student/progress"
                className="flex items-center gap-3 p-3 bg-white/40 rounded-xl hover:bg-white/60 transition-all"
              >
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-slate-700">
                  View Progress
                </span>
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
