import { useState, useEffect } from "react";
import { adminService } from "@/services/admin";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
  Badge,
  Button,
} from "@/components/ui";
import { Plus, Upload, MoreVertical, ShieldBan, Download, Copy, RefreshCw, X, Check, Activity, Globe, Monitor, Lock, Unlock, LogOut, AlertTriangle, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

const StudentManagementPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Bulk Upload State
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Single User Create State
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "student",
    rollNumber: "",
    dob: "",
    department: "",
    yearOfStudy: "",
    collegeName: "",
  });

  // Credentials Modal State
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string, password: string, userId?: string } | null>(null);
  const [editPasswordMode, setEditPasswordMode] = useState(false);
  const [newPasswordContext, setNewPasswordContext] = useState("");

  // Edit Student Modal State
  const [editStudent, setEditStudent] = useState<any | null>(null);
  const [editUserForm, setEditUserForm] = useState({ username: "", newPassword: "" });
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [assignedSkillsData, setAssignedSkillsData] = useState<any[]>([]);
  

  useEffect(() => {
    fetchUsers();
    fetchSkills();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers({ role: "student", limit: 50 });
      if (res.success) {
        setUsers(res.data?.items || []);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const isDatabaseReset = () => {
    if (loading || users.length === 0) return false;
    const seedEmails = ["john.doe@student.com", "jane.smith@student.com"];
    return users.every(u => seedEmails.includes(u.email.toLowerCase()));
  };

  const fetchSkills = async () => {
    try {
      const res = await adminService.getSkills({ limit: 100 });
      if (res.success) {
        setAllSkills(res.data?.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch skills", e);
    }
  };

  const openEditStudent = async (user: any) => {
    setEditStudent(null); // Reset
    setEditUserForm({ username: user.username, newPassword: "" });
    setSelectedSkillIds([]);
    setAssignedSkillsData([]);
    

    // Show skeleton/loading modal natively immediately
    setEditStudent({ id: user.id, _loadingDetails: true, ...user });

    try {
      const res = await adminService.getUser(user.id);
      if (res.success && res.data) {
        const fullUser = res.data;
        const assignedSkillIds = fullUser.studentSkills?.map((ss: any) => ss.skill.id) || [];
        setSelectedSkillIds(assignedSkillIds);
        setAssignedSkillsData(fullUser.studentSkills || []);
        setEditUserForm({ username: fullUser.username, newPassword: "" });
        setEditStudent(fullUser);
      }
    } catch (e) {
      toast.error("Failed to fetch current user profile");
      setEditStudent(null);
    } finally {
      
    }
  };

  const handleUpdateStudentProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent || editStudent._loadingDetails) return;
    try {
      // 1. Update basic auth
      const payload: any = {};
      if (editUserForm.username !== editStudent.username) payload.username = editUserForm.username;
      if (editUserForm.newPassword) payload.password = editUserForm.newPassword;

      if (Object.keys(payload).length > 0) {
        await adminService.updateUser(editStudent.id, payload);
      }

      // 2. Assign Skills
      await adminService.assignSkillsToStudent(editStudent.id, selectedSkillIds);

      toast.success("Student profile updated!");
      setEditStudent(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to update profile");
    }
  };

  const handleToggleFreeze = async () => {
    if (!editStudent) return;
    try {
      const newBlockedValue = !editStudent.isBlocked;
      await adminService.updateUser(editStudent.id, { isBlocked: newBlockedValue });
      setEditStudent({ ...editStudent, isBlocked: newBlockedValue });
      toast.success(newBlockedValue ? "Account frozen." : "Account un-frozen.");
      fetchUsers();
    } catch (e: any) {
      toast.error("Failed to alter block status");
    }
  };

  const handleClearSession = async () => {
    if (!editStudent) return;
    try {
      await adminService.forceLogout(editStudent.id, "Administrative Action");
      toast.success("Old device session wiped. Student can now login anew.");
      setEditStudent({ ...editStudent, isLoggedIn: false });
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to clear session.");
    }
  }

  const handleForceLogoutRow = async (id: string) => {
    try {
      await adminService.forceLogout(id, "Administrative Action");
      toast.success("User forcefully logged out.");
      fetchUsers();
    } catch (error: any) {
      toast.error("Logout failed");
    }
  }

  // .. (Bulk Upload & Single Create logic hidden for brevity but retained functionally)
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    try {
      const toastId = toast.loading("Uploading students...");
      const res = await adminService.uploadStudentsBulk(file);
      toast.dismiss(toastId);
      if (res.success) {
        toast.success(`Successfully uploaded ${res.createdCount} students! Emails sent.`);
        setShowBulkUpload(false);
        setFile(null);
        fetchUsers();
        if (res.credentialsCsv) {
          const blob = new Blob([res.credentialsCsv], { type: "text/csv" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `bulk_credentials_${Date.now()}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Bulk upload failed");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminService.createUser(formData);
      if (res.success) {
        toast.success("User created successfully & email sent!");
        setShowCreate(false);
        setFormData({ fullName: "", email: "", role: "student", rollNumber: "", dob: "", department: "", yearOfStudy: "", collegeName: "" });
        fetchUsers();
        if (res.data?.credentials) {
          setCreatedCredentials({
            username: res.data.credentials.username,
            password: res.data.credentials.password,
            userId: res.data.user.id
          });
          setNewPasswordContext("");
          setEditPasswordMode(false);
        }
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to create user");
    }
  };

  const handleUpdatePassword = async () => {
    if (!createdCredentials?.userId || !newPasswordContext) return;
    try {
      const res = await adminService.resetPassword(createdCredentials.userId, newPasswordContext);
      if (res.success) {
        toast.success("Password updated successfully!");
        setCreatedCredentials({
          ...createdCredentials,
          password: newPasswordContext
        });
        setEditPasswordMode(false);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Password update failed");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  }


  return (
    <div className="space-y-8 relative pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Student Management
          </h1>
          <p className="text-slate-500 mt-1">Manage platform student accounts, security, & assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-slate-500" leftIcon={<FileSpreadsheet size={18} />} onClick={() => adminService.exportUsers("student")}>
            Export List
          </Button>
          <Button variant="secondary" leftIcon={<Upload size={18} />} onClick={() => {
            setShowBulkUpload(!showBulkUpload);
            setShowCreate(false);
          }}>
            Bulk Upload
          </Button>
          <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => {
            setShowCreate(!showCreate);
            setShowBulkUpload(false);
          }}>
            Add Student
          </Button>
        </div>
      </div>

      {isDatabaseReset() && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="text-amber-800 font-bold text-sm">⚠️ System data was reset during an update.</h4>
            <p className="text-amber-700 text-xs mt-1">
              Your manually added students were purged during a schema upgrade. Please re-upload your source CSV or restore from a SQL backup.
            </p>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <GlassCard variant="secondary" padding="lg">
          {/* Form kept concise */}
          <GlassCardHeader
            title="Bulk Upload Students"
            action={<Button size="sm" variant="ghost" onClick={adminService.downloadStudentTemplate}><Download size={16} className="mr-2" /> Download Template</Button>}
          />
          <GlassCardContent>
            <div className="mb-4 text-sm text-slate-600">Template optionally includes <b>dob</b>, <b>department</b>, <b>yearOfStudy</b>, <b>collegeName</b>.</div>
            <form onSubmit={handleBulkUpload} className="flex gap-4 items-end">
              <div className="flex-1"><label className="block text-sm font-medium text-slate-700 mb-1">CSV File</label>
                <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <Button type="submit" variant="primary" disabled={!file}>Upload & Send Emails</Button>
            </form>
          </GlassCardContent>
        </GlassCard>
      )}

      {showCreate && (
        /* Basic Form layout unchanged */
        <GlassCard variant="secondary" padding="lg">
          <GlassCardHeader title="Create Single Student" />
          <GlassCardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Inputs layout unchanged */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                  <input type="text" required className="w-full px-4 py-2 border rounded-xl" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Email *</label>
                  <input type="email" required className="w-full px-4 py-2 border rounded-xl" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Roll Number</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-xl" value={formData.rollNumber} onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Date of Birth</label>
                  <input type="date" className="w-full px-4 py-2 border rounded-xl" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Department</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-xl" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Year/Standard</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-xl" value={formData.yearOfStudy} onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })} />
                </div>
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <label className="block text-sm text-slate-700 mb-1">College Name</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-xl" value={formData.collegeName} onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end pt-2"><Button type="submit" variant="primary">Create Student</Button></div>
            </form>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Users List */}
      <GlassCard variant="secondary" padding="lg">
        <GlassCardHeader title="All Students" />
        <GlassCardContent>
          {loading ? <p>Loading...</p> : users.length === 0 ? <p className="text-center py-8 text-slate-500">No students found.</p> : (
            <div className="overflow-x-auto min-h-[250px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-slate-500 text-sm">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Roll Number</th>
                    <th className="pb-3 font-medium">Account Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-white/10 hover:bg-white/40 transition-colors">
                      <td className="py-4 text-slate-700 font-medium">
                        {user.fullName}
                        <div className="text-xs text-slate-400">{user.username}</div>
                      </td>
                      <td className="py-4 text-slate-600">{user.email}</td>
                      <td className="py-4 text-slate-600">{user.rollNumber || "N/A"}</td>
                      <td className="py-4 flex gap-2 items-center flex-wrap">
                        {user.isBlocked ? (
                          <Badge variant="error" icon={<Lock size={12} />}>Frozen</Badge>
                        ) : (
                          <Badge variant={user.isActive ? "success" : "warning"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                        )}
                        {user.isLoggedIn && (
                          <Badge variant="purple" icon={<Activity size={12} />}>Online Now</Badge>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.isLoggedIn && (
                            <Button size="sm" variant="ghost" title="Force Logout Device" onClick={() => handleForceLogoutRow(user.id)}>
                              <LogOut size={16} className="text-slate-400 hover:text-orange-500" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => openEditStudent(user)}>
                            <MoreVertical size={16} className="text-slate-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* COMPREHENSIVE EDIT STUDENT MODAL */}
      {editStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-full flex flex-col relative animate-in zoom-in-95 duration-200 border border-slate-200">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:px-8 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl shrink-0">
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Manage Student Profile
                </h3>
                <p className="text-sm text-slate-500 mt-1">{editStudent.fullName} ({editStudent.email})</p>
              </div>
              <button onClick={() => setEditStudent(null)} className="text-slate-400 hover:text-slate-700 bg-white shadow-sm border p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-5 sm:p-8 overflow-y-auto flex-1">
              {editStudent._loadingDetails ? (
                <div className="h-40 flex items-center justify-center text-slate-400 animate-pulse">
                  Syncing real-time network and progress data...
                </div>
              ) : (
                <form id="editStudentForm" onSubmit={handleUpdateStudentProfile} className="space-y-10">

                  {/* 1. Account Security & Network Status */}
                  <section>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                        <ShieldBan size={16} className="text-purple-500" /> Security & Device Restrictions
                      </h4>
                      {/* Freeze Toggle */}
                      <Button
                        type="button"
                        size="sm"
                        variant={editStudent.isBlocked ? "primary" : "ghost"}
                        className={editStudent.isBlocked ? "bg-red-500 hover:bg-red-600 text-white border-red-500" : "text-slate-500"}
                        onClick={handleToggleFreeze}
                      >
                        {editStudent.isBlocked ? <><Lock size={14} className="mr-2" /> Account Frozen</> : <><Unlock size={14} className="mr-2" /> Freeze Account</>}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-2">
                          <Activity size={14} /> Active Session / Single-Device Lock
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold ${editStudent.isLoggedIn ? "text-emerald-600" : "text-slate-500"}`}>
                            {editStudent.isLoggedIn ? "Online (1 Device Locked)" : "Offline (Slot Ready)"}
                          </span>
                          {editStudent.isLoggedIn && (
                            <Button size="sm" type="button" variant="ghost" className="text-orange-500 hover:bg-orange-50" onClick={handleClearSession}>
                              Clear Login
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Active logins prevent new devices joining.</p>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-2">
                          <Monitor size={14} /> Last Used Device Frame
                        </div>
                        <p className="font-medium text-slate-800 line-clamp-2" title={editStudent.lastLoginDevice || "Unknown"}>
                          {editStudent.lastLoginDevice || "No device recorded"}
                        </p>
                        {editStudent.lastLoginAt && (
                          <p className="text-xs text-slate-400 mt-2">
                            Since: {format(new Date(editStudent.lastLoginAt), "PP p")}
                          </p>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-2">
                          <Globe size={14} /> Network DNS / IP Vector
                        </div>
                        <p className="font-mono text-slate-800 tracking-wider">
                          {editStudent.lastLoginIp || "0.0.0.0"}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">IPv4/IPv6 Capture Socket</p>
                      </div>
                    </div>
                  </section>

                  {/* 2. Base Credentials */}
                  <section>
                    <h4 className="text-sm font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100 uppercase tracking-wide flex items-center gap-2">
                      <Lock size={16} className="text-purple-500" /> Authentication
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Portal Username</label>
                        <input type="text"
                          value={editUserForm.username}
                          onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Override Password</label>
                        <input type="password" placeholder="Leave blank to keep active password"
                          value={editUserForm.newPassword}
                          onChange={(e) => setEditUserForm({ ...editUserForm, newPassword: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-shadow placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                  </section>

                  {/* 3. Skill Assignments & Live Progress */}
                  <section>
                    <h4 className="text-sm font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Check size={16} className="text-purple-500" /> Global Course Access & Progress Tracking
                      </span>
                      <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                        {selectedSkillIds.length} Enrolled
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allSkills.length === 0 && <p className="text-sm text-slate-500 italic">No skills exist in the system yet.</p>}

                      {allSkills.map(skill => {
                        const isSelected = selectedSkillIds.includes(skill.id);
                        // Extract internal tracked progress
                        const studentProgressNode = assignedSkillsData.find((ss: any) => ss.skillId === skill.id) || null;

                        const tasksDone = studentProgressNode?.totalTasksCompleted || 0;
                        const pct = studentProgressNode?.progressPercentage || 0;

                        return (
                          <div
                            key={skill.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedSkillIds(selectedSkillIds.filter(id => id !== skill.id));
                              } else {
                                setSelectedSkillIds([...selectedSkillIds, skill.id]);
                              }
                            }}
                            className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between gap-3 min-h-[90px] ${isSelected
                                ? 'border-purple-500 bg-purple-50/50 shadow-sm'
                                : 'border-slate-100 hover:border-purple-200 bg-white shadow-sm'
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <Check size={14} strokeWidth={3} />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800 leading-snug">{skill.name}</p>
                                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">{skill.skillCode}</p>
                              </div>
                            </div>

                            {/* Real-time embedded progress metric (only displays metrics if officially enrolled previously) */}
                            {studentProgressNode && isSelected && (
                              <div className="mt-2 pl-8">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-semibold text-slate-600">Completion</span>
                                  <span className="font-bold text-emerald-600">{pct}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-wide">
                                  Tasks Submitted: {tasksDone}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:px-8 border-t border-slate-100 flex gap-3 justify-end bg-slate-50/50 rounded-b-2xl shrink-0">
              <Button variant="ghost" type="button" onClick={() => setEditStudent(null)} className="font-medium text-slate-600">Dismiss</Button>
              <Button type="submit" form="editStudentForm" variant="primary" disabled={editStudent._loadingDetails} className="shadow-md">
                Execute All Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Credentials Modal Overlay - Unchanged */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent mb-2">
                Student Created Successfully!
              </h3>
              <p className="text-slate-600 text-sm mb-6">
                An email has been sent to the student. Here are their credentials:
              </p>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4 mb-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Username</p>
                  <div className="flex justify-between items-center bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm">
                    <span className="text-slate-800 font-medium">{createdCredentials.username}</span>
                    <button type="button" onClick={() => copyToClipboard(createdCredentials.username)} className="text-slate-400 hover:text-purple-500 transition-colors">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</p>
                    {!editPasswordMode && (
                      <button type="button" onClick={() => setEditPasswordMode(true)} className="text-xs text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1">
                        <RefreshCw size={12} /> Expose Override
                      </button>
                    )}
                  </div>

                  {!editPasswordMode ? (
                    <div className="flex justify-between items-center bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm">
                      <span className="text-slate-800 font-mono tracking-wider">{createdCredentials.password}</span>
                      <button type="button" onClick={() => copyToClipboard(createdCredentials.password)} className="text-slate-400 hover:text-purple-500 transition-colors">
                        <Copy size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg font-mono outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                        placeholder="New password..."
                        value={newPasswordContext}
                        onChange={e => setNewPasswordContext(e.target.value)}
                      />
                      <Button size="sm" variant="primary" type="button" onClick={handleUpdatePassword} disabled={!newPasswordContext}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" type="button" onClick={() => { setEditPasswordMode(false); setNewPasswordContext(""); }}>
                        X
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="primary" onClick={() => setCreatedCredentials(null)}>
                  Got It
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagementPage;
