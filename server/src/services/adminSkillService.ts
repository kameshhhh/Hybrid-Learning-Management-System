import { PrismaClient, SkillStatus, Skill } from '@prisma/client';
import { Errors } from '../utils/AppError';
import { createSkillSchema, updateSkillSchema, skillListQuerySchema } from '../validators/skillValidator';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const prisma = new PrismaClient();

export class AdminSkillService {

  // ============================================
  // CREATE SKILL
  // ============================================
  async createSkill(data: any, adminId: string) {
    // Validate data
    const validated = createSkillSchema.parse(data);
    
    // Check unique skill code
    const existingSkill = await prisma.skill.findUnique({
      where: { skillCode: validated.skillCode }
    });
    
    if (existingSkill) {
      throw Errors.duplicateEntry('Skill code');
    }
    
    // Check unique skill name
    const existingName = await prisma.skill.findFirst({
      where: { name: validated.name }
    });
    
    if (existingName) {
      throw Errors.duplicateEntry('Skill name');
    }
    
    // Create skill
    const skill = await prisma.skill.create({
      data: {
        skillCode: validated.skillCode,
        name: validated.name,
        description: validated.description,
        durationWeeks: validated.durationWeeks,
        status: SkillStatus.draft,
        
        // New Fields
        preparedBy: validated.preparedBy as any,
        externalLinks: validated.externalLinks as any,
        standardsFollowed: validated.standardsFollowed as any,
        skillCoverage: validated.skillCoverage as any,
        totalDays: validated.totalDays,
        totalHours: validated.totalHours,
        overallOutcome: validated.overallOutcome,
        relevance: validated.relevance,

        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
    
    // Assign faculty if provided
    if (validated.facultyIds && validated.facultyIds.length > 0) {
      for (const facultyId of validated.facultyIds) {
        await prisma.skillFaculty.create({
          data: {
            skillId: skill.id,
            facultyId: facultyId,
            assignedBy: adminId,
            isPrimary: facultyId === validated.primaryFacultyId,
            assignedAt: new Date(),
            isActive: true,
          }
        });
      }
    }
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CREATE_SKILL',
        entityType: 'skill',
        entityId: skill.id,
        newValues: validated as any,
        ipAddress: 'system',
      }
    });
    
    // Return skill with faculty assignments
    const skillWithFaculty = await prisma.skill.findUnique({
      where: { id: skill.id },
      include: {
        faculty: {
          include: {
            faculty: {
              select: {
                id: true,
                fullName: true,
                email: true,
              }
            }
          }
        }
      }
    });
    
    return { success: true, skill: skillWithFaculty };
  }

  // ============================================
  // UPDATE SKILL
  // ============================================
  async updateSkill(skillId: string, data: any, adminId: string) {
    // Check if skill exists
    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId }
    });
    
    if (!existingSkill) {
      throw Errors.notFound('Skill');
    }
    
    // Store old values for audit
    const oldValues = { ...existingSkill };
    
    // Validate update data
    const validated = updateSkillSchema.parse(data);
    
    // If skill was approved and we're updating content, revert to draft
    let newStatus = validated.status || existingSkill.status;
    if (existingSkill.status === 'approved' && Object.keys(validated).length > 0) {
      // If updating name, description, or duration, revert to draft
      if (validated.name || validated.description || validated.durationWeeks) {
        newStatus = SkillStatus.draft;
      }
    }
    
    // Update skill
    const updatedSkill = await prisma.skill.update({
      where: { id: skillId },
      data: {
        name: validated.name,
        description: validated.description,
        durationWeeks: validated.durationWeeks,
        status: newStatus as any,
        
        // New Fields
        preparedBy: validated.preparedBy as any,
        externalLinks: validated.externalLinks as any,
        standardsFollowed: validated.standardsFollowed as any,
        skillCoverage: validated.skillCoverage as any,
        totalDays: validated.totalDays,
        totalHours: validated.totalHours,
        overallOutcome: validated.overallOutcome,
        relevance: validated.relevance,

        updatedAt: new Date(),
      }
    });
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_SKILL',
        entityType: 'skill',
        entityId: skillId,
        oldValues: oldValues as any,
        newValues: { ...validated, status: newStatus } as any,
      }
    });
    
    return { success: true, skill: updatedSkill };
  }

  // ============================================
  // DELETE/ARCHIVE SKILL
  // ============================================
  async deleteSkill(skillId: string, adminId: string, permanent: boolean = false) {
    // Check if skill exists
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        studentSkills: {
          where: { status: 'active' }
        }
      }
    });
    
    if (!skill) {
      throw Errors.notFound('Skill');
    }
    
    // Check active assignments
    const activeAssignments = skill.studentSkills.length;
    if (activeAssignments > 0) {
      throw new Error(`Cannot delete: ${activeAssignments} students actively assigned to this skill`);
    }
    
    if (permanent) {
      // Permanent delete (cascade)
      await prisma.skill.delete({
        where: { id: skillId }
      });
      
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'PERMANENT_DELETE_SKILL',
          entityType: 'skill',
          entityId: skillId,
          oldValues: skill as any,
        }
      });
      
      return { success: true, message: 'Skill permanently deleted' };
    } else {
      // Soft delete - archive
      const archivedSkill = await prisma.skill.update({
        where: { id: skillId },
        data: {
          status: SkillStatus.archived,
          updatedAt: new Date(),
        }
      });
      
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'ARCHIVE_SKILL',
          entityType: 'skill',
          entityId: skillId,
          oldValues: { status: skill.status } as any,
          newValues: { status: 'archived' } as any,
        }
      });
      
      return { success: true, message: 'Skill archived successfully', skill: archivedSkill };
    }
  }

  // ============================================
  // RESTORE ARCHIVED SKILL
  // ============================================
  async restoreSkill(skillId: string, adminId: string) {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId, status: SkillStatus.archived }
    });
    
    if (!skill) {
      throw Errors.notFound('Archived skill');
    }
    
    const restoredSkill = await prisma.skill.update({
      where: { id: skillId },
      data: {
        status: SkillStatus.draft,
        updatedAt: new Date(),
      }
    });
    
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'RESTORE_SKILL',
        entityType: 'skill',
        entityId: skillId,
        newValues: { status: 'draft' } as any,
      }
    });
    
    return { success: true, skill: restoredSkill };
  }

  // ============================================
  // GET SKILL BY ID
  // ============================================
  async getSkillById(skillId: string) {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true }
        },
        approver: {
          select: { id: true, fullName: true, email: true }
        },
        faculty: {
          where: { isActive: true },
          include: {
            faculty: {
              select: { id: true, fullName: true, email: true, phone: true }
            },
            assigner: {
              select: { id: true, fullName: true }
            }
          }
        },
        chapters: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' }
            }
          }
        },
        tasks: {
          orderBy: { dayNumber: 'asc' }
        },
        studentSkills: {
          where: { status: 'active' },
          select: {
            id: true,
            student: {
              select: { id: true, fullName: true, email: true }
            }
          }
        }
      }
    });
    
    if (!skill) {
      throw Errors.notFound('Skill');
    }
    
    // Add statistics
    const stats = {
      total_chapters: skill.chapters.length,
      total_lessons: skill.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0),
      total_tasks: skill.tasks.length,
      total_faculty: skill.faculty.length,
      total_students: skill.studentSkills.length,
    };
    
    // Map back for response to match UI expecting snake_case
    const responseSkill = {
        ...skill,
        skill_code: skill.skillCode,
        duration_weeks: skill.durationWeeks,
        thumbnail_url: skill.thumbnailUrl,
        created_at: skill.createdAt,
        updated_at: skill.updatedAt,
        faculty_assignments: skill.faculty.map(f => ({
            ...f,
            faculty_id: f.facultyId,
            is_primary: f.isPrimary
        }))
    };
    
    return { ...responseSkill, stats };
  }

  // ============================================
  // GET ALL SKILLS (with filters)
  // ============================================
  async getAllSkills(query: any) {
    const validated = skillListQuerySchema.parse(query);
    const { page, limit, status, search, facultyId, sortBy, sortOrder } = validated;
    const skip = (page - 1) * limit;
    
    // Build where clause
    let where: any = {};
    
    if (status !== 'all') {
      where.status = status as any;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { skillCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (facultyId) {
      where.facultyAssignments = {
        some: {
          facultyId: facultyId,
          isActive: true
        }
      };
    }
    
    // Translate sortBy string keys to Prisma CamelCase fields
    const sortFieldMap: any = {
      createdAt: 'createdAt',
      name: 'name',
      skillCode: 'skillCode',
      durationWeeks: 'durationWeeks',
      created_at: 'createdAt', // Fallback for safety
      skill_code: 'skillCode',
      duration_weeks: 'durationWeeks'
    };
    const mappedSortBy = sortFieldMap[sortBy] || 'createdAt';

    // Get skills with pagination
    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [mappedSortBy]: sortOrder },
        include: {
          creator: {
            select: { id: true, fullName: true }
          },
          faculty: {
            where: { isActive: true },
            include: {
              faculty: {
                select: { id: true, fullName: true, email: true }
              }
            }
          },
          studentSkills: {
            where: { status: 'active' },
            select: { id: true }
          },
          _count: {
            select: {
              chapters: true,
              tasks: true
            }
          }
        }
      }),
      prisma.skill.count({ where })
    ]);
    
    // Transform skills with additional stats
    const skillsWithStats = skills.map(skill => ({
      ...skill,
      skill_code: skill.skillCode,
      duration_weeks: skill.durationWeeks,
      thumbnail_url: skill.thumbnailUrl,
      created_at: skill.createdAt,
      updated_at: skill.updatedAt,
      stats: {
        total_chapters: skill._count.chapters,
        total_tasks: skill._count.tasks,
        total_faculty: skill.faculty.length,
        total_students: skill.studentSkills.length,
      },
      _count: undefined
    }));
    
    return {
      skills: skillsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      }
    };
  }

  // ============================================
  // APPROVE SKILL
  // ============================================
  async approveSkill(skillId: string, adminId: string, rejectionReason?: string) {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId }
    });
    
    if (!skill) {
      throw Errors.notFound('Skill');
    }
    
    if (skill.status !== 'pending_approval' && skill.status !== 'draft') {
      throw new Error(`Cannot approve skill with status: ${skill.status}`);
    }
    
    const updatedSkill = await prisma.skill.update({
      where: { id: skillId },
      data: {
        status: rejectionReason ? SkillStatus.rejected : SkillStatus.approved,
        approvedBy: rejectionReason ? null : adminId,
        approvedAt: rejectionReason ? null : new Date(),
        rejectionReason: rejectionReason || null,
        updatedAt: new Date(),
      }
    });
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: rejectionReason ? 'REJECT_SKILL' : 'APPROVE_SKILL',
        entityType: 'skill',
        entityId: skillId,
        newValues: { 
          status: rejectionReason ? 'rejected' : 'approved',
          rejectionReason: rejectionReason 
        } as any,
      }
    });
    
    // Notify faculty if assigned
    const facultyAssignments = await prisma.skillFaculty.findMany({
      where: { skillId: skillId, isActive: true },
      include: { faculty: true }
    });
    
    for (const assignment of facultyAssignments) {
      await prisma.notification.create({
        data: {
          userId: assignment.facultyId,
          title: rejectionReason ? 'Skill Content Rejected' : 'Skill Content Approved',
          message: rejectionReason 
            ? `Your skill "${skill.name}" has been rejected. Reason: ${rejectionReason}`
            : `Congratulations! Your skill "${skill.name}" has been approved and is now live.`,
          type: rejectionReason ? 'error' : 'success',
          actionUrl: `/faculty/skills/${skillId}`, // Note: Notification model might use actionUrl.
        }
      });
    }
    
    return { 
      success: true, 
      skill: updatedSkill,
      message: rejectionReason ? 'Skill rejected' : 'Skill approved'
    };
  }

  // ============================================
  // UPLOAD SKILL THUMBNAIL
  // ============================================
  async uploadThumbnail(skillId: string, file: Express.Multer.File, adminId: string) {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId }
    });
    
    if (!skill) {
      throw Errors.notFound('Skill');
    }
    
    // Process image with sharp
    const filename = `skill_${skillId}_${Date.now()}.webp`;
    const uploadPath = path.join(__dirname, '../../../uploads/skills');
    
    // Ensure directory exists
    await fs.mkdir(uploadPath, { recursive: true });
    
    // Resize and optimize image
    await sharp(file.buffer)
      .resize(800, 450, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(path.join(uploadPath, filename));
    
    const thumbnailUrl = `/uploads/skills/${filename}`;
    
    // Update skill with thumbnail URL
    const updatedSkill = await prisma.skill.update({
      where: { id: skillId },
      data: {
        thumbnailUrl: thumbnailUrl,
        updatedAt: new Date(),
      }
    });
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPLOAD_THUMBNAIL',
        entityType: 'skill',
        entityId: skillId,
        newValues: { thumbnailUrl: thumbnailUrl } as any,
      }
    });
    
    return { success: true, thumbnailUrl };
  }

  // ============================================
  // UPDATE FACULTY ASSIGNMENTS
  // ============================================
  async updateFacultyAssignments(skillId: string, facultyIds: string[], primaryFacultyId: string | null, adminId: string) {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId }
    });
    
    if (!skill) {
      throw Errors.notFound('Skill');
    }
    
    // Get existing assignments
    const existingAssignments = await prisma.skillFaculty.findMany({
      where: { skillId: skillId, isActive: true }
    });
    
    const existingFacultyIds = existingAssignments.map(a => a.facultyId);
    
    // Faculty to add
    const toAdd = facultyIds.filter(id => !existingFacultyIds.includes(id));
    
    // Faculty to remove
    const toRemove = existingFacultyIds.filter(id => !facultyIds.includes(id));
    
    // Add new assignments
    for (const facultyId of toAdd) {
      await prisma.skillFaculty.create({
        data: {
          skillId: skillId,
          facultyId: facultyId,
          assignedBy: adminId,
          isPrimary: facultyId === primaryFacultyId,
          assignedAt: new Date(),
          isActive: true,
        }
      });
    }
    
    // Remove old assignments
    for (const facultyId of toRemove) {
      await prisma.skillFaculty.updateMany({
        where: {
          skillId: skillId,
          facultyId: facultyId,
          isActive: true
        },
        data: {
          isActive: false,
          removedAt: new Date(),
          removedBy: adminId,
          removalReason: 'Removed by admin',
        }
      });
    }
    
    // Update primary faculty flag for remaining
    if (primaryFacultyId) {
      await prisma.skillFaculty.updateMany({
        where: {
          skillId: skillId,
          isActive: true
        },
        data: { isPrimary: false }
      });
      
      await prisma.skillFaculty.updateMany({
        where: {
          skillId: skillId,
          facultyId: primaryFacultyId,
          isActive: true
        },
        data: { isPrimary: true }
      });
    }
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_FACULTY_ASSIGNMENTS',
        entityType: 'skill',
        entityId: skillId,
        newValues: { facultyIds, primaryFacultyId } as any,
      }
    });
    
    return { success: true, added: toAdd.length, removed: toRemove.length };
  }
}
