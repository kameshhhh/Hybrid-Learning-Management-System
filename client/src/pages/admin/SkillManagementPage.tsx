import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "@/services/admin";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
  Badge,
  Button,
} from "@/components/ui";
import { Plus, Edit2, CheckCircle, XCircle, Users, BookOpen, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const SkillManagementPage = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    skillCode: "",
    description: "",
    durationWeeks: 4,
  });

  // Access Management State
  const [manageSkillId, setManageSkillId] = useState<string | null>(null);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [studentList, setStudentList] = useState<any[]>([]);

  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const res = await adminService.getSkills();

      // Handle response structures: raw `{ skills }` or wrapped `{ success: true, data: { skills } }`
      const payload = res.data || res;
      const items = Array.isArray(payload.skills)
        ? payload.skills
        : Array.isArray(payload.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];

      setSkills(items);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error?.message || "Failed to fetch skills",
      );
    } finally {
      setLoading(false);
    }
  };

  const openManageModal = async (skillId: string) => {
    setManageSkillId(skillId);
    setSelectedFacultyId("");
    setSelectedStudentIds([]);
    try {
      const facRes = await adminService.getUsers({ role: "faculty" });
      const stuRes = await adminService.getUsers({ role: "student" });
      setFacultyList(Array.isArray(facRes?.data?.items) ? facRes.data.items : Array.isArray(facRes?.data) ? facRes.data : []);
      setStudentList(Array.isArray(stuRes?.data?.items) ? stuRes.data.items : Array.isArray(stuRes?.data) ? stuRes.data : []);
    } catch {
      toast.error("Failed to fetch users");
    }
  };

  const handleAssignFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultyId) return toast.error("Select faculty");
    try {
      await adminService.assignFacultyToSkill(manageSkillId!, selectedFacultyId, true);
      toast.success("Faculty assigned successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to assign faculty");
    }
  };

  const handleAssignStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) return toast.error("Select at least one student");
    try {
      await adminService.assignStudentsToSkill(manageSkillId!, selectedStudentIds);
      toast.success("Students assigned successfully!");
      setSelectedStudentIds([]);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to assign students");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        skillCode: formData.skillCode.toUpperCase(),
        description: formData.description,
        durationWeeks: Number(formData.durationWeeks),
      };

      let res;
      if (editingSkillId) {
        res = await adminService.updateSkill(editingSkillId, payload);
      } else {
        res = await adminService.createSkill(payload);
      }

      if (res.success) {
        toast.success(editingSkillId ? "Skill updated successfully" : "Skill created successfully");
        setShowForm(false);
        setEditingSkillId(null);
        setFormData({
          name: "",
          skillCode: "",
          description: "",
          durationWeeks: 4,
        });
        fetchSkills();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error?.message || `Failed to ${editingSkillId ? 'update' : 'create'} skill`,
      );
    }
  };

  const handleEditClick = (skill: any) => {
    setEditingSkillId(skill.id);
    setFormData({
      name: skill.name || "",
      skillCode: skill.skillCode || "",
      description: skill.description || "",
      durationWeeks: skill.durationWeeks || 4,
    });
    setShowForm(true);
  };

  const handleApprove = async (id: string, action: "approve" | "reject") => {
    try {
      if (action === "approve") {
        await adminService.approveSkill(id);
        toast.success("Skill approved");
      } else {
        await adminService.rejectSkill(id, "Rejected by admin");
        toast.success("Skill rejected");
      }
      fetchSkills();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Action failed");
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await adminService.activateSkill(id);
      toast.success("Skill activated");
      fetchSkills();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Activation failed");
    }
  };

  const handleDeleteSkill = async (id: string, name: string) => {
    if (!window.confirm(`CRITICAL ACTION: Are you sure you want to PERMANENTLY DELETE the skill "${name}"? This will remove all chapters, lessons, and student progress associated with it.`)) {
      return;
    }

    try {
      const res = await adminService.deleteSkill(id);
      if (res.success) {
        toast.success("Skill deleted permanently");
        fetchSkills();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Deletion failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Skill Management
          </h1>
          <p className="text-slate-500 mt-1">
            Create and manage learning skills across the platform.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingSkillId(null);
              setFormData({ name: "", skillCode: "", description: "", durationWeeks: 4 });
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? "Cancel" : "Create Skill"}
        </Button>
      </div>

      {showForm && (
        <GlassCard variant="secondary" padding="lg">
          <GlassCardHeader title={editingSkillId ? "Edit Skill" : "Create New Skill"} />
          <GlassCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Skill Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Skill Code
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    value={formData.skillCode}
                    onChange={(e) =>
                      setFormData({ ...formData, skillCode: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duration (Weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    value={formData.durationWeeks}
                    onChange={(e) =>
                      setFormData({ ...formData, durationWeeks: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary">
                  Save Skill
                </Button>
              </div>
            </form>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Skills List */}
      <GlassCard variant="secondary" padding="lg">
        <GlassCardHeader title="All Skills" />
        <GlassCardContent>
          {loading ? (
            <p>Loading...</p>
          ) : skills.length === 0 ? (
            <p className="text-slate-500">No skills found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-slate-500 text-sm">
                    <th className="pb-3 font-medium">Code</th>
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Chapters</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {skills.map((skill) => (
                    <tr
                      key={skill.id}
                      className="border-b border-white/10 hover:bg-white/40 transition-colors"
                    >
                      <td className="py-4 text-slate-700 font-medium">
                        {skill.skillCode}
                      </td>
                      <td className="py-4 text-slate-700">{skill.name}</td>
                      <td className="py-4">
                        <Badge
                          variant={
                            skill.status === "active"
                              ? "success"
                              : skill.status === "pending_approval"
                                ? "warning"
                                : "default"
                          }
                        >
                          {skill.status}
                        </Badge>
                      </td>
                      <td className="py-4 text-slate-500">
                        {skill._count?.chapters || 0}
                      </td>
                      <td className="py-4 text-right flex items-center justify-end gap-2">
                        {skill.status === "pending_approval" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(skill.id, "approve")}
                            >
                              <CheckCircle
                                size={16}
                                className="text-green-500"
                              />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(skill.id, "reject")}
                            >
                              <XCircle size={16} className="text-red-500" />
                            </Button>
                          </>
                        )}
                        {skill.status === "approved" && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleActivate(skill.id)}
                          >
                            Activate
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openManageModal(skill.id)}>
                          <Users size={16} className="text-purple-500 mr-1" /> Access
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/skills/${skill.id}/builder`)}>
                          <BookOpen size={16} className="text-blue-500" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEditClick(skill)}>
                          <Edit2 size={16} className="text-slate-500" />
                        </Button>
                        <Button size="sm" variant="ghost" className="hover:bg-red-50" onClick={() => handleDeleteSkill(skill.id, skill.name)}>
                          <Trash2 size={16} className="text-red-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Access Management Modal overlay implementation */}
      {manageSkillId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl">
            <GlassCard padding="lg">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200/50 pb-4">
                <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Manage Skill Access
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setManageSkillId(null)}>
                  <XCircle className="w-5 h-5 text-slate-500" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={handleAssignFaculty} className="space-y-4">
                  <h4 className="font-medium text-slate-800">Assign Faculty</h4>
                  <p className="text-sm text-slate-500">Pick a primary instructor for this skill.</p>
                  <div>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none"
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value)}
                    >
                      <option value="">Select Faculty...</option>
                      {facultyList.map(f => (
                        <option key={f.id} value={f.id}>{f.fullName} ({f.email})</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" variant="primary">Assign Faculty</Button>
                </form>

                <form onSubmit={handleAssignStudents} className="space-y-4">
                  <h4 className="font-medium text-slate-800">Enroll Students</h4>
                  <p className="text-sm text-slate-500">Multi-select to batch enroll students.</p>
                  <div>
                    <select
                      multiple
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none h-32"
                      value={selectedStudentIds}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setSelectedStudentIds(values);
                      }}
                    >
                      {studentList.map(s => (
                        <option key={s.id} value={s.id}>{s.fullName} ({s.rollNumber || s.email})</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" variant="primary">Enroll Students</Button>
                </form>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillManagementPage;
