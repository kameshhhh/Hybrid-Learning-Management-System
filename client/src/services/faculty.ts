import api from "./api";

export const facultyService = {
  // Dashboard & Skills
  getDashboard: async () => {
    const response = await api.get("/faculty/dashboard");
    return response.data;
  },
  getMySkills: async () => {
    const response = await api.get("/faculty/skills");
    return response.data;
  },
  getSkillDetails: async (skillId: string) => {
    const response = await api.get(`/faculty/skills/${skillId}`);
    return response.data;
  },
  updateSkill: async (skillId: string, data: any) => {
    const response = await api.put(`/faculty/skills/${skillId}`, data);
    return response.data;
  },

  // Chapters
  createChapter: async (skillId: string, data: any) => {
    const response = await api.post(`/faculty/skills/${skillId}/chapters`, data);
    return response.data;
  },
  updateChapter: async (chapterId: string, data: any) => {
    const response = await api.put(`/faculty/chapters/${chapterId}`, data);
    return response.data;
  },
  updateChapterBlocks: async (chapterId: string, blocks: any[]) => {
    const response = await api.put(`/faculty/chapters/${chapterId}`, { blocks });
    return response.data;
  },
  deleteChapter: async (chapterId: string) => {
    const response = await api.delete(`/faculty/chapters/${chapterId}`);
    return response.data;
  },

  // Day Content (JSONB Blocks)
  updateDayContent: async (chapterId: string, data: any) => {
    const response = await api.put(`/faculty/chapters/${chapterId}/content`, data);
    return response.data;
  },
  updateTechnicalKnowledge: async (chapterId: string, data: any) => {
    const response = await api.put(`/faculty/chapters/${chapterId}/technical-knowledge`, data);
    return response.data;
  },
  updateTestingMeasurements: async (chapterId: string, data: any) => {
    const response = await api.put(`/faculty/chapters/${chapterId}/testing-measurements`, data);
    return response.data;
  },
  updateMaintenanceRepair: async (chapterId: string, data: any) => {
    const response = await api.put(`/faculty/chapters/${chapterId}/maintenance-repair`, data);
    return response.data;
  },
  updateChecklistConfig: async (chapterId: string, data: any) => {
    const response = await api.put(`/faculty/chapters/${chapterId}/checklist-config`, data);
    return response.data;
  },
  updateMCQData: async (chapterId: string, data: any) => {
    const response = await api.put(`/faculty/chapters/${chapterId}/mcq-data`, data);
    return response.data;
  },

  // Lessons
  createLesson: async (chapterId: string, data: any) => {
    const response = await api.post(`/faculty/chapters/${chapterId}/lessons`, data);
    return response.data;
  },
  uploadVideo: async (lessonId: string, file: File) => {
    const formData = new FormData();
    formData.append("video", file);
    const response = await api.post(`/faculty/lessons/${lessonId}/upload-video`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000 
    });
    return response.data;
  },
  uploadMaterial: async (lessonId: string, file: File) => {
    const formData = new FormData();
    formData.append("material", file);
    const response = await api.post(`/faculty/lessons/${lessonId}/upload-material`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000 
    });
    return response.data;
  },
  updateLesson: async (lessonId: string, data: any) => {
    const response = await api.put(`/faculty/lessons/${lessonId}`, data);
    return response.data;
  },
  deleteLesson: async (lessonId: string) => {
    const response = await api.delete(`/faculty/lessons/${lessonId}`);
    return response.data;
  },

  // Tasks
  createTask: async (chapterId: string, data: any) => {
    const response = await api.post(`/faculty/chapters/${chapterId}/tasks`, data);
    return response.data;
  },
  updateTask: async (taskId: string, data: any) => {
    const response = await api.put(`/faculty/tasks/${taskId}`, data);
    return response.data;
  },
  deleteTask: async (taskId: string) => {
    const response = await api.delete(`/faculty/tasks/${taskId}`);
    return response.data;
  },
  getAllTasks: async () => {
    const response = await api.get("/faculty/tasks/all");
    return response.data;
  },

  // Assessments
  getAssessments: async (params?: { status?: string; skillId?: string; page?: number; limit?: number }) => {
    const response = await api.get("/faculty/assessments", { params });
    return response.data;
  },
  getAssessmentDetail: async (assessmentId: string) => {
    const response = await api.get(`/faculty/assessments/${assessmentId}`);
    return response.data;
  },
  evaluateAssessment: async (assessmentId: string, data: { marksObtained: number; rubricScores: any; feedback: string }) => {
    const response = await api.post(`/faculty/assessments/${assessmentId}/evaluate`, data);
    return response.data;
  },

  // Submit skill for approval
  submitForApproval: async (skillId: string) => {
    const response = await api.post(`/faculty/skills/${skillId}/submit-for-approval`);
    return response.data;
  },

  // Progress Logs - FIXED: route uses POST not PUT
  getProgressLogs: async (params?: { status?: string; skillId?: string }) => {
    const response = await api.get("/faculty/progress-logs", { params });
    return response.data;
  },
  reviewProgressLog: async (logId: string, data: { remarks: string; isApproved: boolean }) => {
    const response = await api.post(`/faculty/progress-logs/${logId}/review`, data);
    return response.data;
  },

  // Students
  getStudents: async (params?: { skillId?: string }) => {
    const response = await api.get("/faculty/students", { params });
    return response.data;
  },

  // Skill students with progress
  getSkillStudents: async (skillId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/faculty/skills/${skillId}/students`, { params });
    return response.data;
  },
  getStudentDetail: async (skillId: string, studentId: string) => {
    const response = await api.get(`/faculty/skills/${skillId}/students/${studentId}`);
    return response.data;
  },

  // Bulk Updates
  updateFullCurriculum: async (skillId: string, chapters: any[]) => {
    const response = await api.put(`/faculty/skills/${skillId}/curriculum`, { chapters });
    return response.data;
  },
};

export default facultyService;
