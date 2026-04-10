import api from "./api";

export const studentService = {
  getDashboard: async () => {
    const response = await api.get("/student/dashboard");
    return response.data;
  },
  getMySkills: async (status: string = "active") => {
    const response = await api.get("/student/skills", { params: { status } });
    return response.data;
  },
  getSkillDetails: async (skillId: string) => {
    const response = await api.get(`/student/skills/${skillId}`);
    return response.data;
  },

  // Lessons and Progress
  getLesson: async (lessonId: string) => {
    const response = await api.get(`/student/lessons/${lessonId}`);
    return response.data;
  },
  updateVideoProgress: async (lessonId: string, watchedPercentage: number, currentPosition: number) => {
    const response = await api.post(`/student/lessons/${lessonId}/progress`, {
      watchedPercentage,
      currentPosition
    });
    return response.data;
  },
  updateBlockProgress: async (chapterId: string, blockId: string) => {
    const response = await api.post(`/student/chapters/${chapterId}/blocks/${blockId}/progress`);
    return response.data;
  },
  updateBlockWatchTime: async (chapterId: string, blockId: string, data: { seconds: number; maxTime: number; isCompleted?: boolean }) => {
    const response = await api.post(`/student/chapters/${chapterId}/blocks/${blockId}/watch-time`, data);
    return response.data;
  },

  // Tasks
  getTaskDetails: async (taskId: string, skillId?: string) => {
    const response = await api.get(`/student/tasks/${taskId}`, { params: { skillId } });
    return response.data;
  },
  submitTask: async (taskId: string, data: { submissionText?: string; file?: File; skillId?: string }) => {
    const formData = new FormData();
    if (data.submissionText) formData.append("submissionText", data.submissionText);
    if (data.file) formData.append("file", data.file);
    if (data.skillId) formData.append("skillId", data.skillId);
    
    let headers: Record<string, string> = { };
    if (data.file) {
      headers["Content-Type"] = "multipart/form-data";
    }

    const payload = data.file ? formData : { ...data };
    const response = await api.post(`/student/tasks/${taskId}/submit`, payload, {
      headers
    });
    return response.data;
  },

  // Grades and Logs
  getGrades: async (params?: { skillId?: string; page?: number; limit?: number }) => {
    const response = await api.get("/student/grades", { params });
    return response.data;
  },
  getProgressLogs: async (params?: { skillId?: string }) => {
    const response = await api.get("/student/progress-logs", { params });
    return response.data;
  },
  submitProgressLog: async (skillId: string, data: any) => {
    const response = await api.post(`/student/skills/${skillId}/progress-logs`, data);
    return response.data;
  },
  getCertificates: async () => {
    const response = await api.get("/student/certificates");
    return response.data;
  },
};

export default studentService;
