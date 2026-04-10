import { Request, Response, NextFunction } from 'express';
import { AdminSkillService } from '../services/adminSkillService';
import { AppError } from '../utils/AppError';
import multer from 'multer';

const skillService = new AdminSkillService();

// Configure multer for memory storage (we'll process with sharp)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.'));
    }
  }
});

export class AdminSkillController {

  // ============================================
  // CREATE SKILL
  // ============================================
  async createSkill(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError(401, 'Unauthorized', 'AUTH_001');
      
      const result = await skillService.createSkill(req.body, adminId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // UPDATE SKILL
  // ============================================
  async updateSkill(req: Request, res: Response, next: NextFunction) {
    try {
      const { skillId } = req.params;
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError(401, 'Unauthorized', 'AUTH_001');
      
      const result = await skillService.updateSkill(skillId as string, req.body, adminId as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // DELETE SKILL
  // ============================================
  async deleteSkill(req: Request, res: Response, next: NextFunction) {
    try {
      const { skillId } = req.params;
      const { permanent } = req.query;
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError(401, 'Unauthorized', 'AUTH_001');
      
      const result = await skillService.deleteSkill(skillId as string, adminId as string, permanent === 'true');
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // RESTORE SKILL
  // ============================================
  async restoreSkill(req: Request, res: Response, next: NextFunction) {
    try {
      const { skillId } = req.params;
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError(401, 'Unauthorized', 'AUTH_001');
      
      const result = await skillService.restoreSkill(skillId as string, adminId as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET SKILL BY ID
  // ============================================
  async getSkillById(req: Request, res: Response, next: NextFunction) {
    try {
      const { skillId } = req.params;
      const result = await skillService.getSkillById(skillId as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET ALL SKILLS
  // ============================================
  async getAllSkills(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await skillService.getAllSkills(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // APPROVE SKILL
  // ============================================
  async approveSkill(req: Request, res: Response, next: NextFunction) {
    try {
      const { skillId } = req.params;
      const { rejection_reason, reason } = req.body;
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError(401, 'Unauthorized', 'AUTH_001');
      
      const result = await skillService.approveSkill(skillId as string, adminId as string, rejection_reason || reason);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // UPLOAD THUMBNAIL
  // ============================================
  async uploadThumbnail(req: Request, res: Response, next: NextFunction) {
    try {
      const { skillId } = req.params;
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError(401, 'Unauthorized', 'AUTH_001');
      
      if (!req.file) {
        throw new AppError(400, 'No file uploaded', 'VALID_001');
      }
      
      const result = await skillService.uploadThumbnail(skillId as string, req.file, adminId as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // UPDATE FACULTY ASSIGNMENTS
  // ============================================
  async updateFacultyAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { skillId } = req.params;
      const { facultyIds, primaryFacultyId } = req.body;
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError(401, 'Unauthorized', 'AUTH_001');
      
      const result = await skillService.updateFacultyAssignments(skillId as string, facultyIds, primaryFacultyId, adminId as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

// Export multer middleware for thumbnail upload
export const uploadThumbnailMiddleware = upload.single('thumbnail');
