/**
 * ============================================================
 * ADMIN DASHBOARD PAGE
 * ============================================================
 *
 * The main dashboard view for administrators.
 * Displays:
 * - Key statistics (skills, students, faculty, etc.)
 * - Recent activities
 * - Pending approvals
 * - Quick actions
 *
 * Design: Velox glassmorphism style with stats cards grid
 *
 * ============================================================
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { adminService } from "@/services/admin";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
  StatsCard,
  Badge,
  Button,
} from "@/components/ui";
import {
  BookOpen,
  Users,
  GraduationCap,
  Award,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

// Types
interface DashboardStats {
  totalStudents: number;
  totalFaculty: number;
  totalSkills: number;
  activeSkills: number;
  pendingApproval: number;
}

interface RecentStudent {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

interface RecentSubmission {
  id: string;
  submittedAt: string;
  student: { fullName: string };
  task: { title: string };
  skill: { name: string };
}

/**
 * AdminDashboard Component
 *
 * The main dashboard view for admin users.
 */
const AdminDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalFaculty: 0,
    totalSkills: 0,
    activeSkills: 0,
    pendingApproval: 0,
  });
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<
    RecentSubmission[]
  >([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDashboardStats();
      if (response.success && response.data) {
        setStats(response.data.stats);
        setRecentStudents(response.data.recentStudents || []);
        setRecentSubmissions(response.data.recentSubmissions || []);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error?.message || "Failed to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Welcome back, {user?.fullName?.split(" ")[0]}!
          </h1>
          <p className="text-slate-500 mt-1">
            Here's what's happening with your platform today.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            leftIcon={<Plus size={18} />}
            className="hidden md:flex"
            onClick={() => navigate("/admin/students")}
          >
            Add Student
          </Button>
          <Button 
            variant="primary" 
            leftIcon={<BookOpen size={18} />}
            onClick={() => navigate("/admin/skills")}
          >
            Create Skill
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Total Skills"
          value={stats.totalSkills}
          icon={<BookOpen size={24} />}
          accentColor="purple"
        />
        <StatsCard
          title="Active Students"
          value={stats.totalStudents}
          icon={<GraduationCap size={24} />}
          accentColor="blue"
        />
        <StatsCard
          title="Total Faculty"
          value={stats.totalFaculty}
          icon={<Users size={24} />}
          accentColor="green"
        />
        <StatsCard
          title="Active Skills"
          value={stats.activeSkills}
          icon={<Award size={24} />}
          accentColor="orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Students */}
        <GlassCard variant="secondary" padding="lg">
          <GlassCardHeader
            title="Recent Students"
            subtitle="Students added in the last 7 days"
            action={
              <Link
                to="/admin/students"
                className="text-sm text-purple-500 hover:text-purple-600 flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
              </Link>
            }
          />
          <GlassCardContent>
            <div className="space-y-4">
              {recentStudents.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No recent students</p>
              ) : (
                recentStudents.map((student) => (
                  <div
                    key={student.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl",
                      "hover:bg-white/40 transition-colors",
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg",
                        "bg-blue-100 text-blue-600",
                        "flex items-center justify-center",
                        "flex-shrink-0",
                      )}
                    >
                      <GraduationCap size={16} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 font-medium truncate">
                        {student.fullName}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {student.email} • {formatRelativeTime(student.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Recent Submissions */}
        <GlassCard variant="secondary" padding="lg">
          <GlassCardHeader
            title="Recent Submissions"
            subtitle={`${recentSubmissions.length} submissions in the last 7 days`}
            action={
              <Link
                to="/admin/reports"
                className="text-sm text-purple-500 hover:text-purple-600 flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
              </Link>
            }
          />
          <GlassCardContent>
            <div className="space-y-3">
              {recentSubmissions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No recent submissions</p>
              ) : (
                recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className={cn(
                      "p-4 rounded-xl",
                      "bg-white/40",
                      "hover:bg-white/60 transition-colors",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="purple" size="sm">
                            {submission.skill.name}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {submission.task.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          By {submission.student.fullName} • {formatRelativeTime(submission.submittedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <GlassCard variant="card" padding="md" hoverable>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl",
                "bg-gradient-to-br from-amber-500/20 to-amber-500/5",
                "flex items-center justify-center",
                "text-amber-600",
              )}
            >
              <Clock size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {stats.pendingApproval}
              </p>
              <p className="text-sm text-slate-500">Pending Approvals</p>
            </div>
          </div>
        </GlassCard>

        {/* Active Skills */}
        <GlassCard variant="card" padding="md" hoverable>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl",
                "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5",
                "flex items-center justify-center",
                "text-emerald-600",
              )}
            >
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {stats.activeSkills}
              </p>
              <p className="text-sm text-slate-500">Active Skills</p>
            </div>
          </div>
        </GlassCard>

        {/* System Health */}
        <GlassCard variant="card" padding="md" hoverable>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl",
                "bg-gradient-to-br from-green-500/20 to-green-500/5",
                "flex items-center justify-center",
                "text-green-600",
              )}
            >
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">Healthy</p>
              <p className="text-sm text-slate-500">System Status</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default AdminDashboard;
