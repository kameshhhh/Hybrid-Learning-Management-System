import { Request, Response } from 'express';
import { authService } from '../services/authService';

export class AdminSessionController {
  
  // ============================================
  // GET ALL ACTIVE SESSIONS (Admin Portal)
  // ============================================
  async getAllActiveSessions(req: Request, res: Response) {
    try {
      const { userId, role } = req.query;
      
      const sessions = await authService.getAllActiveSessions({
        userId: userId as unknown as string,
        role: role as unknown as any,
      });
      
      return res.status(200).json({
        success: true,
        data: {
          sessions,
          total: sessions.length,
        }
      });
      
    } catch (error) {
      console.error('Get active sessions error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
  
  // ============================================
  // GET USER LOGIN HISTORY (Admin Portal)
  // ============================================
  async getUserLoginHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { limit = 50 } = req.query;
      
      const history = await authService.getUserLoginHistory(userId as string, parseInt(limit as string));
      
      return res.status(200).json({
        success: true,
        data: history
      });
      
    } catch (error) {
      console.error('Get login history error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
  
  // ============================================
  // FORCE LOGOUT USER (Admin Portal)
  // ============================================
  async forceLogoutUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { reason, resetPassword = true } = req.body;
      const adminId = req.user?.userId;
      
      if (!reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: 'Reason is required for force logout' }
        });
      }
      
      const result = await authService.forceLogout(userId as string, adminId as string, reason, resetPassword);
      
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.newPassword ? { newPassword: result.newPassword } : undefined
      });
      
    } catch (error) {
      console.error('Force logout error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
  
  // ============================================
  // BLOCK/UNBLOCK USER (Admin Portal)
  // ============================================
  async toggleUserBlock(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { block, reason } = req.body;
      const adminId = req.user?.userId;
      
      if (block === undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: 'Block status is required' }
        });
      }
      
      const result = await authService.toggleUserBlock(userId as string, adminId as string, block, reason);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: result.message }
        });
      }
      
      return res.status(200).json({
        success: true,
        message: result.message
      });
      
    } catch (error) {
      console.error('Toggle block error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
  
  // ============================================
  // ADMIN RESET USER PASSWORD (Admin Portal)
  // ============================================
  async adminResetPassword(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const adminId = req.user?.userId;
      
      const result = await authService.adminResetPassword(userId as string, adminId as string);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: result.message }
        });
      }
      
      return res.status(200).json({
        success: true,
        message: result.message,
        data: { newPassword: result.newPassword } // Only for admin view
      });
      
    } catch (error) {
      console.error('Admin reset password error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
  
  // ============================================
  // GET FAILED LOGIN ATTEMPTS (Admin Portal)
  // ============================================
  async getFailedLoginAttempts(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id: userId as string },
        select: {
          id: true,
          username: true,
          fullName: true,
          failedLoginAttempts: true,
          lockedUntil: true,
        }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOTFOUND_001', message: 'User not found' }
        });
      }
      
      // Get recent failed login audit logs
      const failedLogs = await prisma.auditLog.findMany({
        where: {
          userId: userId as string,
          action: 'ACCOUNT_LOCKED',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      
      return res.status(200).json({
        success: true,
        data: {
          failedAttempts: user.failedLoginAttempts,
          lockedUntil: user.lockedUntil,
          isLocked: user.lockedUntil ? new Date(user.lockedUntil) > new Date() : false,
          recentLockEvents: failedLogs,
        }
      });
      
    } catch (error) {
      console.error('Get failed attempts error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
  
  // ============================================
  // RESET FAILED LOGIN COUNTER (Admin Portal)
  // ============================================
  async resetFailedLoginCounter(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const adminId = req.user?.userId;
      
      await prisma.user.update({
        where: { id: userId as string },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      
      await prisma.auditLog.create({
        data: {
          userId: adminId as string,
          action: 'RESET_FAILED_LOGIN_COUNTER',
          entityType: 'user',
          entityId: userId as string,
        },
      });
      
      return res.status(200).json({
        success: true,
        message: 'Failed login counter reset successfully'
      });
      
    } catch (error) {
      console.error('Reset counter error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
}

// Import prisma for the controller
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const adminSessionController = new AdminSessionController();
