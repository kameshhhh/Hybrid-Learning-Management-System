import { useState, useEffect } from "react";
import { adminService } from "@/services/admin";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
  Badge,
  Button,
} from "@/components/ui";
import { Plus, Upload, MoreVertical, ShieldBan, Download, Copy, RefreshCw, X,  Activity, Globe, Monitor, Lock, Unlock, LogOut, FileSpreadsheet, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

const FacultyManagementPage = () => {
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
    role: "faculty",
    
  });

  // Credentials Modal State
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string, password: string, userId?: string } | null>(null);
  const [editPasswordMode, setEditPasswordMode] = useState(false);
  const [newPasswordContext, setNewPasswordContext] = useState("");

  // Edit Faculty Modal State
  const [editFaculty, setEditFaculty] = useState<any | null>(null);
  const [editUserForm, setEditUserForm] = useState({ username: "", newPassword: "" });
  
  
  
  

  useEffect(() => {
    fetchUsers();
    
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers({ role: "faculty", limit: 50 });
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
    const seedEmails = ["dr.smith@skillcourse.com", "prof.johnson@skillcourse.com"];
    return users.every(u => seedEmails.includes(u.email.toLowerCase()));
  };

  

  const openEditFaculty = async (user: any) => {
    setEditFaculty(null); // Reset
    setEditUserForm({ username: user.username, newPassword: "" });
    
    
    

    // Show skeleton/loading modal natively immediately
    setEditFaculty({ id: user.id, _loadingDetails: true, ...user });

    try {
      const res = await adminService.getUser(user.id);
      if (res.success && res.data) {
        const fullUser = res.data;
        
        
        
        setEditUserForm({ username: fullUser.username, newPassword: "" });
        setEditFaculty(fullUser);
      }
    } catch (e) {
      toast.error("Failed to fetch current user profile");
      setEditFaculty(null);
    } finally {
      
    }
  };

  const handleUpdateFacultyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFaculty || editFaculty._loadingDetails) return;
    try {
      // 1. Update basic auth
      const payload: any = {};
      if (editUserForm.username !== editFaculty.username) payload.username = editUserForm.username;
      if (editUserForm.newPassword) payload.password = editUserForm.newPassword;

      if (Object.keys(payload).length > 0) {
        await adminService.updateUser(editFaculty.id, payload);
      }

      
      

      toast.success("Faculty profile updated!");
      setEditFaculty(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to update profile");
    }
  };

  const handleToggleFreeze = async () => {
    if (!editFaculty) return;
    try {
      const newBlockedValue = !editFaculty.isBlocked;
      await adminService.updateUser(editFaculty.id, { isBlocked: newBlockedValue });
      setEditFaculty({ ...editFaculty, isBlocked: newBlockedValue });
      toast.success(newBlockedValue ? "Account frozen." : "Account un-frozen.");
      fetchUsers();
    } catch (e: any) {
      toast.error("Failed to alter block status");
    }
  };

  const handleClearSession = async () => {
    if (!editFaculty) return;
    try {
      await adminService.forceLogout(editFaculty.id, "Administrative Action");
      toast.success("Old device session wiped. Faculty can now login anew.");
      setEditFaculty({ ...editFaculty, isLoggedIn: false });
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
      const toastId = toast.loading("Uploading facultys...");
      const res = await adminService.uploadFacultyBulk(file);
      toast.dismiss(toastId);
      if (res.success) {
        toast.success(`Successfully uploaded ${res.createdCount} facultys! Emails sent.`);
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
        setFormData({ fullName: "", email: "", role: "faculty",  });
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
            Faculty Management
          </h1>
          <p className="text-slate-500 mt-1">Manage platform faculty accounts, security, & assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-slate-500" leftIcon={<FileSpreadsheet size={18} />} onClick={() => adminService.exportUsers("faculty")}>
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
            Add Faculty
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
              Your manually added faculty members were purged during a schema upgrade. Please re-upload your source CSV or restore from a SQL backup.
            </p>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <GlassCard variant="secondary" padding="lg">
          {/* Form kept concise */}
          <GlassCardHeader
            title="Bulk Upload Facultys"
            action={<Button size="sm" variant="ghost" onClick={adminService.downloadFacultyTemplate}><Download size={16} className="mr-2" /> Download Template</Button>}
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
          <GlassCardHeader title="Create Single Faculty" />
          <GlassCardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Inputs layout unchanged */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                  <input type="text" required className="w-full px-4 py-2 border rounded-xl" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Email *</label>
                  <input type="email" required className="w-full px-4 py-2 border rounded-xl" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end pt-2"><Button type="submit" variant="primary">Create Faculty</Button></div>
            </form>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Users List */}
      <GlassCard variant="secondary" padding="lg">
        <GlassCardHeader title="All Facultys" />
        <GlassCardContent>
          {loading ? <p>Loading...</p> : users.length === 0 ? <p className="text-center py-8 text-slate-500">No facultys found.</p> : (
            <div className="overflow-x-auto min-h-[250px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-slate-500 text-sm">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    
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
                          <Button size="sm" variant="ghost" onClick={() => openEditFaculty(user)}>
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
      {editFaculty && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-full flex flex-col relative animate-in zoom-in-95 duration-200 border border-slate-200">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:px-8 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl shrink-0">
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Manage Faculty Profile
                </h3>
                <p className="text-sm text-slate-500 mt-1">{editFaculty.fullName} ({editFaculty.email})</p>
              </div>
              <button onClick={() => setEditFaculty(null)} className="text-slate-400 hover:text-slate-700 bg-white shadow-sm border p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-5 sm:p-8 overflow-y-auto flex-1">
              {editFaculty._loadingDetails ? (
                <div className="h-40 flex items-center justify-center text-slate-400 animate-pulse">
                  Syncing real-time network and progress data...
                </div>
              ) : (
                <form id="editFacultyForm" onSubmit={handleUpdateFacultyProfile} className="space-y-10">

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
                        variant={editFaculty.isBlocked ? "primary" : "ghost"}
                        className={editFaculty.isBlocked ? "bg-red-500 hover:bg-red-600 text-white border-red-500" : "text-slate-500"}
                        onClick={handleToggleFreeze}
                      >
                        {editFaculty.isBlocked ? <><Lock size={14} className="mr-2" /> Account Frozen</> : <><Unlock size={14} className="mr-2" /> Freeze Account</>}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-2">
                          <Activity size={14} /> Active Session / Single-Device Lock
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold ${editFaculty.isLoggedIn ? "text-emerald-600" : "text-slate-500"}`}>
                            {editFaculty.isLoggedIn ? "Online (1 Device Locked)" : "Offline (Slot Ready)"}
                          </span>
                          {editFaculty.isLoggedIn && (
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
                        <p className="font-medium text-slate-800 line-clamp-2" title={editFaculty.lastLoginDevice || "Unknown"}>
                          {editFaculty.lastLoginDevice || "No device recorded"}
                        </p>
                        {editFaculty.lastLoginAt && (
                          <p className="text-xs text-slate-400 mt-2">
                            Since: {format(new Date(editFaculty.lastLoginAt), "PP p")}
                          </p>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-2">
                          <Globe size={14} /> Network DNS / IP Vector
                        </div>
                        <p className="font-mono text-slate-800 tracking-wider">
                          {editFaculty.lastLoginIp || "0.0.0.0"}
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

                  

                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:px-8 border-t border-slate-100 flex gap-3 justify-end bg-slate-50/50 rounded-b-2xl shrink-0">
              <Button variant="ghost" type="button" onClick={() => setEditFaculty(null)} className="font-medium text-slate-600">Dismiss</Button>
              <Button type="submit" form="editFacultyForm" variant="primary" disabled={editFaculty._loadingDetails} className="shadow-md">
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
                Faculty Created Successfully!
              </h3>
              <p className="text-slate-600 text-sm mb-6">
                An email has been sent to the faculty. Here are their credentials:
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

export default FacultyManagementPage;
