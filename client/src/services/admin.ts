import api from "./api";

export const adminService = {
  // Dashboard
  getDashboardStats: async () => {
    const response = await api.get("/admin/dashboard");
    return response.data;
  },

  // Users Management
  getUsers: async (params?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/admin/users", { params });
    return response.data;
  },
  getUser: async (id: string) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },
  createUser: async (userData: any) => {
    const response = await api.post("/admin/users", userData);
    return response.data;
  },
  updateUser: async (id: string, userData: any) => {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  },
  deleteUser: async (id: string) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
  forceLogout: async (id: string, reason?: string) => {
    const response = await api.post(`/admin/users/${id}/force-logout`, {
      reason,
    });
    return response.data;
  },
  resetPassword: async (id: string, newPassword?: string) => {
    const response = await api.post(`/admin/users/${id}/reset-password`, {
      newPassword,
    });
    return response.data;
  },
  assignSkillsToStudent: async (id: string, skillIds: string[]) => {
    const response = await api.post(`/admin/users/${id}/skills`, {
      skillIds,
    });
    return response.data;
  },

  // Skills Management
  getSkills: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/admin/skills", { params });
    return response.data;
  },
  getSkill: async (id: string) => {
    const response = await api.get(`/admin/skills/${id}`);
    return response.data;
  },
  createSkill: async (skillData: any) => {
    const response = await api.post("/admin/skills", skillData);
    return response.data;
  },
  updateSkill: async (id: string, skillData: any) => {
    const response = await api.put(`/admin/skills/${id}`, skillData);
    return response.data;
  },
  approveSkill: async (id: string) => {
    const response = await api.post(`/admin/skills/${id}/approve`);
    return response.data;
  },
  rejectSkill: async (id: string, reason: string) => {
    const response = await api.post(`/admin/skills/${id}/reject`, { reason });
    return response.data;
  },
  activateSkill: async (id: string) => {
    const response = await api.post(`/admin/skills/${id}/activate`);
    return response.data;
  },
  deleteSkill: async (id: string) => {
    const response = await api.delete(`/admin/skills/${id}`);
    return response.data;
  },
  assignSkillToGroup: async (id: string, groupId: string) => {
    const response = await api.post(`/admin/skills/${id}/assign-group`, {
      groupId,
    });
    return response.data;
  },
  assignFacultyToSkill: async (id: string, facultyId: string, isPrimary: boolean = false) => {
    const response = await api.post(`/skills/${id}/faculty`, {
      facultyId, isPrimary
    });
    return response.data;
  },
  assignStudentsToSkill: async (id: string, studentIds: string[]) => {
    const response = await api.post(`/skills/${id}/students`, {
      studentIds
    });
    return response.data;
  },

  // Groups Management
  getGroups: async (params?: {
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/admin/groups", { params });
    return response.data;
  },
  createGroup: async (groupData: any) => {
    const response = await api.post("/admin/groups", groupData);
    return response.data;
  },
  addMembersToGroup: async (id: string, studentIds: string[]) => {
    const response = await api.post(`/admin/groups/${id}/members`, {
      studentIds,
    });
    return response.data;
  },
  removeMemberFromGroup: async (id: string, studentId: string) => {
    const response = await api.delete(
      `/admin/groups/${id}/members/${studentId}`,
    );
    return response.data;
  },

  // Reports
  getReportsOverview: async () => {
    const response = await api.get("/admin/reports/overview");
    return response.data;
  },
  getMasterReport: async () => {
    const response = await api.get("/admin/reports/master-data");
    return response.data;
  },
  getSkillReport: async (id: string) => {
    const response = await api.get(`/admin/reports/skill/${id}`);
    return response.data;
  },

  // Bulk Upload
  downloadStudentTemplate: () => {
    window.open(
      `${import.meta.env.VITE_API_URL || "/api/v1"}/admin/students/template`,
      "_blank",
    );
  },
  uploadStudentsBulk: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/admin/students/bulk", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  downloadFacultyTemplate: () => {
    window.open(
      `${import.meta.env.VITE_API_URL || "/api/v1"}/admin/faculty/template`,
      "_blank",
    );
  },
  uploadFacultyBulk: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/admin/faculty/bulk", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  exportUsers: (role: string) => {
    window.open(
      `${import.meta.env.VITE_API_URL || "/api/v1"}/admin/users/export?role=${role}`,
      "_blank",
    );
  },
};

export default adminService;
