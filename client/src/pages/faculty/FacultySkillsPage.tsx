import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronRight,
  FileText,
  GraduationCap,
  Users,
  Eye,
  Send,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { facultyService } from "@/services/faculty";
import { Badge, Button, GlassCard } from "@/components/ui";
import type { Skill } from "@/types";

/**
 * FacultySkillsPage
 * ============================================================
 * Displays all skills assigned to the faculty member with detailed
 * information about each skill's content and students.
 *
 * Features:
 * - Glassmorphism skill cards
 * - Real API calls to /api/v1/faculty/skills
 * - Action buttons: Manage, View Students, Submit for Approval
 * - Loading states and error handling
 * - Enrollment statistics
 * - Status badges
 * ============================================================
 */

const FacultySkillsPage = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingSkillId, setSubmittingSkillId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const res = await facultyService.getMySkills();
      if (res?.success) {
        setSkills(
          Array.isArray(res.data) 
          ? res.data 
          : (res.data?.skills || res.data?.items || [])
        );
      } else {
        toast.error("Failed to load skills");
        setSkills([]);
      }
    } catch (error) {
      console.error("Error loading skills:", error);
      toast.error("Failed to load assigned skills");
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (skillId: string) => {
    try {
      setSubmittingSkillId(skillId);
      const res = await facultyService.submitForApproval(skillId);
      if (res?.success) {
        toast.success("Skill submitted for approval");
        await loadSkills();
      } else {
        toast.error(res?.error?.message || "Failed to submit skill");
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.error?.message || "Failed to submit skill";
      toast.error(errorMsg);
    } finally {
      setSubmittingSkillId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColorMap: Record<string, string> = {
      draft: "bg-yellow-100 text-yellow-800",
      pending_approval: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      active: "bg-emerald-100 text-emerald-800",
      archived: "bg-slate-100 text-slate-800",
    };
    return statusColorMap[status] || "bg-gray-100 text-gray-800";
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              My Skills
            </h1>
            <p className="text-slate-500 mt-1">
              Manage chapters, lessons, and tasks for your assigned courses.
            </p>
          </div>
        </div>
        <GlassCard
          variant="primary"
          padding="lg"
          className="flex items-center justify-center min-h-64"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-slate-600">Loading your assigned skills...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            My Skills
          </h1>
          <p className="text-slate-500 mt-1">
            Manage chapters, lessons, and tasks for your assigned courses.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/40 backdrop-blur-xl rounded-full border border-white/60">
          <BookOpen className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-slate-700">
            {skills.length} {skills.length === 1 ? "Skill" : "Skills"}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {skills.length === 0 ? (
        <GlassCard variant="secondary" padding="lg">
          <div className="text-center py-16 text-slate-500">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <BookOpen size={48} className="text-purple-400" />
              </div>
            </div>
            <p className="text-lg font-medium mb-2">No Skills Assigned</p>
            <p className="text-sm">
              Contact your administrator to get assigned to a skill.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill) => (
            <GlassCard
              key={skill.id}
              variant="card"
              padding="md"
              hoverable
              className="flex flex-col h-full transition-all duration-300"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-white/40">
                <div className="flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-2 shadow-lg">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base line-clamp-2">
                    {skill.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {skill.skillCode}
                  </p>
                </div>
                <Badge
                  className={`text-xs font-semibold ${getStatusColor(skill.status)}`}
                >
                  {formatStatus(skill.status)}
                </Badge>
              </div>

              {/* Content Stats */}
              <div className="space-y-3 mb-5 flex-grow">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50/50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {(skill as any)?._count?.chapters || 0}
                    </p>
                    <p className="text-xs text-blue-700 font-medium">
                      Chapters
                    </p>
                  </div>

                  <div className="bg-purple-50/50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                      {(skill as any)?._count?.tasks || 0}
                    </p>
                    <p className="text-xs text-purple-700 font-medium">Tasks</p>
                  </div>
                </div>

                <div className="bg-emerald-50/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm text-slate-700 font-medium">
                        Enrolled Students
                      </span>
                    </div>
                    <span className="text-lg font-bold text-emerald-600">
                      {(skill as any)?._count?.studentSkills || 0}
                    </span>
                  </div>
                </div>

                {/* Description Preview */}
                {skill.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 italic">
                    {skill.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 mt-auto pt-4 border-t border-white/40">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() =>
                    navigate(`/faculty/skills/${skill.id}`)
                  }
                  rightIcon={<ChevronRight size={14} />}
                  className="text-xs"
                >
                  Manage Content
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() =>
                      navigate(`/faculty/students`)
                    }
                    leftIcon={<Eye size={14} />}
                    className="text-xs"
                  >
                    View Students
                  </Button>

                  {skill.status === "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      isLoading={submittingSkillId === skill.id}
                      onClick={() => handleSubmitForApproval(skill.id)}
                      leftIcon={
                        submittingSkillId !== skill.id && <Send size={14} />
                      }
                      className="text-xs"
                    >
                      Submit
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default FacultySkillsPage;
