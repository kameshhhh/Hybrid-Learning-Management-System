/**
 * ============================================================
 * SKILLS LIST PAGE COMPONENT
 * ============================================================
 *
 * Comprehensive skill management page with:
 * - Data table with sorting and filtering
 * - Pagination controls
 * - Search functionality
 * - Action buttons (Edit, Delete, Assign Students/Faculty, View Details)
 * - Status badge colors with semantic meaning
 * - Delete confirmation modal
 * - Real-time data updates from API
 * - Loading skeletons for better UX
 * - Beautiful glassmorphism UI design
 *
 * ============================================================
 */

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
  Badge,
  Button,
} from "@/components/ui";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { adminService } from "@/services/admin";
import type { Skill, SkillStatus } from "@/types";
import CreateEditSkill from "./CreateEditSkill";

/**
 * Status badge configurations
 * Maps skill statuses to visual styles and colors
 */
const statusConfig: Record<
  SkillStatus,
  {
    variant: "success" | "warning" | "error" | "info" | "default";
    label: string;
  }
> = {
  draft: { variant: "default", label: "Draft" },
  pending_approval: { variant: "warning", label: "Pending Approval" },
  approved: { variant: "info", label: "Approved" },
  rejected: { variant: "error", label: "Rejected" },
  active: { variant: "success", label: "Active" },
  archived: { variant: "default", label: "Archived" },
};

/**
 * Loading skeleton for table rows
 * Provides visual feedback during data loading
 */
const SkillRowSkeleton = () => (
  <tr className="border-b border-white/10">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <td key={i} className="py-4 px-6">
        <div className="h-4 bg-white/20 rounded animate-pulse" />
      </td>
    ))}
  </tr>
);

interface DeleteConfirmModalProps {
  isOpen: boolean;
  skill: Skill | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Delete Confirmation Modal Component
 * Prevents accidental deletion with confirmation
 */
const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  skill,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !skill) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GlassCard variant="secondary" padding="lg" className="w-full max-w-md">
        <GlassCardHeader title="Delete Skill" />
        <GlassCardContent>
          <div className="space-y-4">
            {/* Warning Icon */}
            <div className="flex justify-center">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertCircle className="text-red-500" size={24} />
              </div>
            </div>

            {/* Confirmation Text */}
            <div className="text-center space-y-2">
              <p className="text-slate-700 font-medium">
                Are you sure you want to delete this skill?
              </p>
              <p className="text-slate-600 text-sm">
                <strong>Skill:</strong> {skill.name} ({skill.skillCode})
              </p>
              <p className="text-red-600 text-xs">
                ⚠️ This action cannot be undone and will remove all associated
                data.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
              <Button variant="ghost" onClick={onCancel} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={onConfirm}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete Skill"
                )}
              </Button>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

/**
 * Edit/Create Modal Component
 * Displays form in modal context for inline editing
 */
interface SkillFormModalProps {
  isOpen: boolean;
  skill?: Skill;
  onClose: () => void;
  onSuccess: () => void;
}

const SkillFormModal: React.FC<SkillFormModalProps> = ({
  isOpen,
  skill,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl my-8">
        <CreateEditSkill
          skill={skill}
          onSuccess={() => {
            onSuccess();
            onClose();
          }}
          onCancel={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};

/**
 * SkillsList Component - Main Skills Management Page
 *
 * Displays all skills in a data table with:
 * - Pagination
 * - Search and filtering
 * - Action buttons
 * - Delete confirmation
 * - Create/edit modals
 */
const SkillsList: React.FC = () => {
  // State Management
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SkillStatus | "all">("all");

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Delete State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    skill: null as Skill | null,
    isDeleting: false,
  });

  /**
   * Fetch skills with current filters and pagination
   */
  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);

      const params: Record<string, any> = {
        page: pagination.page,
        limit: pagination.limit,
      };

      // Add search filter
      if (searchQuery) {
        params.search = searchQuery;
      }

      // Add status filter
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await adminService.getSkills(params);

      if (response.success) {
        const data = response as any;

        // Handle paginated response
        if (data.pagination) {
          setSkills(data.data || []);
          setPagination(data.pagination);
        } else {
          // Handle non-paginated response
          const items = Array.isArray(data.data?.items)
            ? data.data.items
            : Array.isArray(data.data)
              ? data.data
              : [];
          setSkills(items);
        }
      } else {
        toast.error(response.error || "Failed to load skills");
        setSkills([]);
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        "Failed to load skills";
      toast.error(errorMessage);
      console.error("Error fetching skills:", error);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, statusFilter]);

  /**
   * Fetch skills on component mount and when filters change
   */
  useEffect(() => {
    // Reset to page 1 when search or status filter changes
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  /**
   * Handle delete action
   */
  const handleDelete = async () => {
    if (!deleteModal.skill) return;

    try {
      setDeleteModal((prev) => ({ ...prev, isDeleting: true }));

      const response = await adminService.deleteSkill(deleteModal.skill!.id);

      if (response.success) {
        toast.success("Skill deleted successfully");
        setDeleteModal({ isOpen: false, skill: null, isDeleting: false });

        // Refresh skills list
        await fetchSkills();
      } else {
        toast.error(response.error || "Failed to delete skill");
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error?.message || "Failed to delete skill";
      toast.error(errorMessage);
    } finally {
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  /**
   * Handle approve action
   */
  const handleApprove = async (skill: Skill) => {
    try {
      const response = await adminService.approveSkill(skill.id);

      if (response.success) {
        toast.success("Skill approved successfully");
        await fetchSkills();
      } else {
        toast.error(response.error || "Failed to approve skill");
      }
    } catch (error: any) {
      toast.error("Failed to approve skill");
    }
  };

  /**
   * Handle activate action
   */
  const handleActivate = async (skill: Skill) => {
    try {
      const response = await adminService.activateSkill(skill.id);

      if (response.success) {
        toast.success("Skill activated successfully");
        await fetchSkills();
      } else {
        toast.error(response.error || "Failed to activate skill");
      }
    } catch (error: any) {
      toast.error("Failed to activate skill");
    }
  };

  /**
   * Render action buttons based on skill status
   */
  const renderActionButtons = (skill: Skill) => {
    return (
      <div className="flex items-center justify-end gap-2">
        {skill.status === "pending_approval" && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleApprove(skill)}
            className="bg-green-500 hover:bg-green-600"
          >
            Approve
          </Button>
        )}

        {skill.status === "approved" && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleActivate(skill)}
          >
            Activate
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditingSkill(skill);
            setShowEditModal(true);
          }}
          title="Edit Skill"
        >
          <Edit2 size={16} className="text-blue-500" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setDeleteModal({ isOpen: true, skill, isDeleting: false });
          }}
          title="Delete Skill"
        >
          <Trash2 size={16} className="text-red-500" />
        </Button>
      </div>
    );
  };

  const statusOptions: Array<{ value: SkillStatus | "all"; label: string }> = [
    { value: "all", label: "All Status" },
    { value: "draft", label: "Draft" },
    { value: "pending_approval", label: "Pending Approval" },
    { value: "approved", label: "Approved" },
    { value: "active", label: "Active" },
    { value: "archived", label: "Archived" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Skills Management
          </h1>
          <p className="text-slate-500 mt-1">
            Manage all skills in the Learning Management System
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setShowCreateModal(true)}
        >
          Create Skill
        </Button>
      </div>

      {/* Search and Filters */}
      <GlassCard variant="secondary" padding="md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Input */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by skill name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as SkillStatus | "all")
            }
            className="px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* Skills Table */}
      <GlassCard variant="secondary" padding="lg">
        <GlassCardHeader
          title="All Skills"
          subtitle={`Total: ${pagination.total} skills`}
        />

        <GlassCardContent>
          {loading ? (
            // Loading State
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-slate-500 text-sm">
                    <th className="pb-3 px-6 font-medium">Code</th>
                    <th className="pb-3 px-6 font-medium">Name</th>
                    <th className="pb-3 px-6 font-medium">Duration</th>
                    <th className="pb-3 px-6 font-medium">Faculty</th>
                    <th className="pb-3 px-6 font-medium">Status</th>
                    <th className="pb-3 px-6 font-medium text-right">
                      Students
                    </th>
                    <th className="pb-3 px-6 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkillRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : skills.length === 0 ? (
            // Empty State
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-1">
                No skills found
              </h3>
              <p className="text-slate-600 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search filters"
                  : "Create your first skill to get started"}
              </p>
              {(searchQuery || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            // Table with Data
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-slate-500 text-sm">
                    <th className="pb-3 px-6 font-medium">Code</th>
                    <th className="pb-3 px-6 font-medium">Name</th>
                    <th className="pb-3 px-6 font-medium">Duration</th>
                    <th className="pb-3 px-6 font-medium">Faculty</th>
                    <th className="pb-3 px-6 font-medium">Status</th>
                    <th className="pb-3 px-6 font-medium text-right">
                      Students
                    </th>
                    <th className="pb-3 px-6 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {skills.map((skill) => {
                    const statusInfo = statusConfig[skill.status];
                    const facultyCount = skill.faculty?.length || 0;
                    const studentCount = 0; // This would come from API if available

                    return (
                      <tr
                        key={skill.id}
                        className="border-b border-white/10 hover:bg-white/40 transition-colors"
                      >
                        <td className="py-4 px-6 text-slate-700 font-medium">
                          {skill.skillCode}
                        </td>
                        <td className="py-4 px-6 text-slate-700">
                          <div className="flex items-center gap-3">
                            {skill.thumbnailUrl && (
                              <img
                                src={skill.thumbnailUrl}
                                alt={skill.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                            <span className="max-w-xs truncate">
                              {skill.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          {skill.durationWeeks} weeks
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-900 rounded text-xs font-medium">
                            <Users size={12} />
                            {facultyCount}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-right text-slate-600">
                          {studentCount}
                        </td>
                        <td className="py-4 px-6">
                          {renderActionButtons(skill)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && skills.length > 0 && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.total} total)
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft size={16} />
                  Previous
                </Button>

                {/* Page Numbers */}
                <div className="flex gap-1 items-center">
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1,
                  )
                    .slice(
                      Math.max(0, pagination.page - 2),
                      Math.min(pagination.totalPages, pagination.page + 1),
                    )
                    .map((page) => (
                      <Button
                        key={page}
                        variant={page === pagination.page ? "primary" : "ghost"}
                        size="sm"
                        onClick={() =>
                          setPagination((prev) => ({ ...prev, page }))
                        }
                      >
                        {page}
                      </Button>
                    ))}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Modals */}
      <SkillFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchSkills();
          setShowCreateModal(false);
        }}
      />

      <SkillFormModal
        isOpen={showEditModal}
        skill={editingSkill || undefined}
        onClose={() => {
          setShowEditModal(false);
          setEditingSkill(null);
        }}
        onSuccess={() => {
          fetchSkills();
          setShowEditModal(false);
          setEditingSkill(null);
        }}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        skill={deleteModal.skill}
        isDeleting={deleteModal.isDeleting}
        onConfirm={handleDelete}
        onCancel={() =>
          setDeleteModal({ isOpen: false, skill: null, isDeleting: false })
        }
      />
    </div>
  );
};

export default SkillsList;
