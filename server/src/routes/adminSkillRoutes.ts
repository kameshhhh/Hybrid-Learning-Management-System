import express from 'express';
import { AdminSkillController, uploadThumbnailMiddleware } from '../controllers/adminSkillController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = express.Router();
const skillController = new AdminSkillController();

// All routes require admin authentication
router.use(authMiddleware);
router.use(requireRole('admin'));

// Skill CRUD
router.post('/skills', skillController.createSkill.bind(skillController));
router.get('/skills', skillController.getAllSkills.bind(skillController));
router.get('/skills/:skillId', skillController.getSkillById.bind(skillController));
router.put('/skills/:skillId', skillController.updateSkill.bind(skillController));
router.delete('/skills/:skillId', skillController.deleteSkill.bind(skillController));
router.post('/skills/:skillId/restore', skillController.restoreSkill.bind(skillController));

// Skill Approval
router.post('/skills/:skillId/approve', skillController.approveSkill.bind(skillController));
router.post('/skills/:skillId/reject', skillController.approveSkill.bind(skillController));

// Skill Thumbnail
router.post(
  '/skills/:skillId/thumbnail',
  uploadThumbnailMiddleware,
  skillController.uploadThumbnail.bind(skillController)
);

// Faculty Assignments
router.put('/skills/:skillId/faculty', skillController.updateFacultyAssignments.bind(skillController));

export default router;
