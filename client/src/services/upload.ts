import api from "./api";

/**
 * uploadService - Handles file uploads to the backend
 * 
 * This service provides methods for uploading various types of files
 * using multipart/form-data.
 */
export const uploadService = {
  /**
   * uploadImage - Uploads an image file
   * @param file - The image file to upload
   * @returns Detailed response including the file URL
   */
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.post("/upload/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  /**
   * uploadVideo - Uploads a video file
   * @param file - The video file to upload
   * @returns Detailed response including the file URL
   */
  uploadVideo: async (file: File) => {
    const formData = new FormData();
    formData.append("video", file);
    const response = await api.post("/upload/video", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  /**
   * uploadDocument - Uploads a document file
   * @param file - The document file to upload
   * @returns Detailed response including the file URL
   */
  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append("document", file);
    const response = await api.post("/upload/document", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
