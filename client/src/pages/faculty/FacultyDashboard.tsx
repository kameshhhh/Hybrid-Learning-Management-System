// ============================================================
// FACULTY DASHBOARD PAGE
// ============================================================
//
// Main dashboard view for faculty members showing:
// - Assigned skills overview
// - Pending submissions to grade
// - Recent grading activity
// - Quick navigation to content management
//
// Uses the Velox glassmorphism design system.
// ============================================================

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GlassCard, StatsCard, Badge, Button } from "@/components/ui";
import api from "@/services/api";
import { socketService } from "@/services/socket";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Users,
  FileText,
  ChevronRight,
  AlertCircle,
  GraduationCap,
} from "lucide-react";

// ===================
// TYPE DEFINITIONS
// ===================

/**
 * Dashboard data structure from API
 */
interface DashboardData {
  skills: Array<{
    id: string;
    name: string;
    skillCode: string;
    _count: {
      chapters: number;
      tasks: number;
      studentSkills: number;
    };
  }>;
  pendingSubmissions: Array<{
    id: string;
    submittedAt: string;
    student: { fullName: string; username: string };
    task: { title: string; dayNumber: number };
    skill: { name: string };
  }>;
  recentAssessments: Array<{
    id: string;
    marksObtained: number;
    assessedAt: string;
    student: { fullName: string };
    task: { title: string };
    skill: { name: string };
  }>;
  stats: {
    totalSkills: number;
    pendingCount: number;
    totalStudents: number;
  };
}

// ===================
// FACULTY DASHBOARD COMPONENT
// ===================

/**
 * FacultyDashboard component
 *
 * Displays overview of faculty member's assigned skills,
 * pending submissions that need grading, and recent activity.
 * Uses glassmorphism design throughout.
 */
export default function FacultyDashboard() {
  // State for dashboard data
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===================
  // DATA FETCHING
  // ===================

  useEffect(() => {
    fetchDashboardData();

    const handleSocketEvent = (data: any) => {
      if (data?.type === "new_submission") {
        fetchDashboardData();
      }
    };

    socketService.socket?.on("notification", handleSocketEvent);

    return () => {
      socketService.socket?.off("notification", handleSocketEvent);
    };
  }, []);

  /**
   * Fetch dashboard data from API
   */
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/faculty/dashboard");
      setData(response.data.data);
      setError(null);
    } catch (err: any) {
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

  /**
   * Format relative time for display
   */
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
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-gradient text-3xl font-bold mb-2">
          Faculty Dashboard
        </h1>
        <p className="text-slate-600">
          Manage your skills, grade submissions, and track student progress
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Assigned Skills"
          value={data?.stats.totalSkills || 0}
          icon={<BookOpen className="w-6 h-6" />}
          color="purple"
        />
        <StatsCard
          title="Pending Submissions"
          value={data?.stats.pendingCount || 0}
          icon={<Clock className="w-6 h-6" />}
          color="amber"
        />
        <StatsCard
          title="Total Students"
          value={data?.stats.totalStudents || 0}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <StatsCard
          title="Graded Today"
          value={data?.recentAssessments?.length || 0}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Submissions - Takes 2 columns */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Pending Submissions
              </h2>
              <Link
                to="/faculty/submissions"
                className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {data?.pendingSubmissions && data.pendingSubmissions.length > 0 ? (
              <div className="space-y-4">
                {data.pendingSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 bg-white/40 rounded-xl hover:bg-white/60 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Student Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                        {submission.student.fullName.charAt(0)}
                      </div>

                      {/* Submission Details */}
                      <div>
                        <p className="font-medium text-slate-800">
                          {submission.student.fullName}
                        </p>
                        <p className="text-sm text-slate-600">
                          Task {submission.task.dayNumber}:{" "}
                          {submission.task.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {submission.skill.name} •{" "}
                          {formatRelativeTime(submission.submittedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Grade Button */}
                    <Button
                      size="sm"
                      onClick={() => {
                        // Navigate to grading page
                      }}
                    >
                      Grade
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>All submissions graded!</p>
                <p className="text-sm">No pending submissions to review</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Recent Assessments */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Recent Grading
            </h2>

            {data?.recentAssessments && data.recentAssessments.length > 0 ? (
              <div className="space-y-4">
                {data.recentAssessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="p-3 bg-white/40 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800 text-sm">
                        {assessment.student.fullName}
                      </span>
                      <Badge variant="success">
                        {assessment.marksObtained}/10
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">
                      {assessment.task.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatRelativeTime(assessment.assessedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent assessments</p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Assigned Skills Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-500" />
          My Skills
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.skills?.map((skill) => (
            <GlassCard
              key={skill.id}
              className="p-6 hover:shadow-lg transition-all cursor-pointer"
              hoverable
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <Badge>{skill.skillCode}</Badge>
              </div>

              <h3 className="font-semibold text-slate-800 mb-2">
                {skill.name}
              </h3>

              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {skill._count.chapters} chapters
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {skill._count.tasks} tasks
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    <Users className="w-4 h-4 inline mr-1" />
                    {skill._count.studentSkills} students
                  </span>
                  <Link
                    to={`/faculty/skills/${skill.id}`}
                    className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                  >
                    Manage
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
