import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient, UserRole } from '@prisma/client';
import { env } from '../config/env';
import { generateAccessToken, generateRefreshToken, TokenPayload } from '../utils/jwt';
import { DeviceInfo, parseDeviceInfo, formatDeviceInfoForStorage } from '../utils/deviceDetector';
import { sendPasswordResetEmail, sendNewCredentialsEmail } from '../utils/emailSender';

const prisma = new PrismaClient();

// Login response interface
export interface LoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
  };
  error?: string;
  currentDevice?: string;
  lastLogin?: Date;
}

// Session validation response
export interface SessionValidationResponse {
  isValid: boolean;
  error?: string;
  session?: any;
}

// Force logout response
export interface ForceLogoutResponse {
  success: boolean;
  message: string;
  newPassword?: string;
}

class AuthService {
  
  // ============================================
  // LOGIN WITH DEVICE TRACKING
  // ============================================
  async login(
    username: string, 
    password: string, 
    deviceInfo: DeviceInfo,
    ipAddress: string
  ): Promise<LoginResponse> {
    try {
      // Find user by username or email
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: username },
            { email: username }
          ],
          isActive: true,
        },
      });

      // User not found
      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is blocked
      if (user.isBlocked) {
        return { 
          success: false, 
          error: `Account blocked. Reason: ${user.blockReason || 'No reason provided'}` 
        };
      }

      // Check if account is locked due to failed attempts
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
        return { 
          success: false, 
          error: `Account locked. Try again in ${minutesLeft} minutes` 
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        await this.handleFailedLogin(user.id);
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if already logged in on another device
      if (user.isLoggedIn) {
        const currentSession = await prisma.session.findFirst({
          where: { userId: user.id, isActive: true },
          orderBy: { loginTime: 'desc' },
        });

        return {
          success: false,
          error: 'Already logged in on another device',
          currentDevice: currentSession?.deviceInfo || 'Unknown device',
          lastLogin: currentSession?.loginTime || undefined,
        };
      }

      // Reset failed login attempts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Create session
      const sessionToken = crypto.randomBytes(64).toString('hex');
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: sessionToken,
          deviceInfo: formatDeviceInfoForStorage(deviceInfo),
          deviceType: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          ipAddress: ipAddress,
          loginTime: new Date(),
          lastActivity: new Date(),
          isActive: true,
        },
      });

      // Update user login status
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isLoggedIn: true,
          current_session_id: session.id,
          last_login_at: new Date(),
          last_login_ip: ipAddress,
          last_login_device: formatDeviceInfoForStorage(deviceInfo),
        },
      });

      // Generate JWT tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        sessionId: session.id,
        role: user.role,
        username: user.username,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken({
        userId: user.id,
        sessionId: session.id,
        type: 'refresh',
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entityType: 'user',
          entity_id: user.id,
          ipAddress: ipAddress,
          user_agent: deviceInfo.userAgent,
        },
      });

      return {
        success: true,
        token: accessToken,
        refreshToken: refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  // ============================================
  // HANDLE FAILED LOGIN ATTEMPT
  // ============================================
  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const newAttempts = user.failedLoginAttempts + 1;

    if (newAttempts >= env.MAX_FAILED_LOGIN_ATTEMPTS) {
      // Lock account
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil: new Date(Date.now() + env.ACCOUNT_LOCKOUT_MINUTES * 60 * 1000),
        },
      });

      // Log security event
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: 'ACCOUNT_LOCKED',
          entityType: 'user',
          entity_id: userId,
          new_values: { reason: 'Too many failed login attempts', attempts: newAttempts } as object,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: newAttempts },
      });
    }
  }

  // ============================================
  // VALIDATE SESSION
  // ============================================
  async validateSession(userId: string, sessionToken: string): Promise<SessionValidationResponse> {
    const session = await prisma.session.findFirst({
      where: {
        userId: userId,
        sessionToken: sessionToken,
        isActive: true,
      },
    });

    if (!session) {
      return { isValid: false, error: 'Session not found' };
    }

    // Check session timeout
    const sessionAge = Date.now() - new Date(session.loginTime).getTime();
    const timeoutMs = env.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000;

    if (sessionAge > timeoutMs) {
      await this.logout(session.userId, session.sessionToken);
      return { isValid: false, error: 'Session expired' };
    }

    // Update last activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    return { isValid: true, session };
  }

  // ============================================
  // LOGOUT
  // ============================================
  async logout(userId: string, sessionToken: string): Promise<{ success: boolean }> {
    const session = await prisma.session.findFirst({
      where: { userId: userId, sessionToken: sessionToken },
    });

    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: {
          logoutTime: new Date(),
          isActive: false,
        },
      });
    }

    // Check if user has any other active sessions
    const otherActiveSessions = await prisma.session.count({
      where: { userId: userId, isActive: true },
    });

    if (otherActiveSessions === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isLoggedIn: false,
          current_session_id: null,
        },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'LOGOUT',
        entityType: 'user',
        entity_id: userId,
      },
    });

    return { success: true };
  }

  // ============================================
  // REFRESH TOKEN
  // ============================================
  async refreshToken(refreshToken: string): Promise<{ success: boolean; token?: string; error?: string }> {
    const { verifyRefreshToken, generateAccessToken } = await import('../utils/jwt');
    const decoded = verifyRefreshToken(refreshToken);
    
    if (!decoded) {
      return { success: false, error: 'Invalid refresh token' };
    }

    // Verify session still exists and is active
    const session = await prisma.session.findFirst({
      where: {
        id: decoded.sessionId,
        userId: decoded.userId,
        isActive: true,
      },
      include: { user: true },
    });

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Generate new access token
    const newToken = generateAccessToken({
      userId: session.user.id,
      sessionId: session.id,
      role: session.user.role,
      username: session.user.username,
    });

    return { success: true, token: newToken };
  }

  // ============================================
  // CHANGE PASSWORD (Logged in user)
  // ============================================
  async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        password_changed_at: new Date(),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'PASSWORD_CHANGED',
        entityType: 'user',
        entity_id: userId,
      },
    });

    return { success: true };
  }

  // ============================================
  // REQUEST PASSWORD RESET (Forgot Password)
  // ============================================
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({ where: { email } });
    
    // For security, always return success even if email not found
    if (!user) {
      return { success: true, message: 'If an account exists with that email, a reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        password_reset_expires: resetExpires,
      },
    });

    // Send email
    await sendPasswordResetEmail(user.email, resetToken, user.username);

    return { success: true, message: 'If an account exists with that email, a reset link has been sent.' };
  }

  // ============================================
  // RESET PASSWORD (With Token)
  // ============================================
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        password_reset_expires: { gt: new Date() },
      },
    });

    if (!user) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        password_reset_expires: null,
        password_changed_at: new Date(),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        entityType: 'user',
        entity_id: user.id,
      },
    });

    return { success: true };
  }

  // ============================================
  // ADMIN: FORCE LOGOUT USER
  // ============================================
  async forceLogout(
    targetUserId: string, 
    adminId: string, 
    reason: string,
    resetPassword: boolean = true
  ): Promise<ForceLogoutResponse> {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    
    if (!targetUser) {
      return { success: false, message: 'User not found' };
    }

    // Get all active sessions
    const activeSessions = await prisma.session.findMany({
      where: { userId: targetUserId, isActive: true },
    });

    // Force logout all sessions
    for (const session of activeSessions) {
      await prisma.session.update({
        where: { id: session.id },
        data: {
          logoutTime: new Date(),
          isActive: false,
          forcedLogoutBy: adminId,
          forcedLogoutReason: reason,
        },
      });
    }

    let newPassword: string | undefined;

    if (resetPassword) {
      // Generate new random password
      newPassword = this.generateSecurePassword();
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          isLoggedIn: false,
          current_session_id: null,
          passwordHash: hashedPassword,
          password_changed_at: new Date(),
        },
      });

      // Send email with new credentials
      await sendNewCredentialsEmail(targetUser.email, targetUser.username, newPassword);
    } else {
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          isLoggedIn: false,
          current_session_id: null,
        },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'FORCE_LOGOUT',
        entityType: 'user',
        entity_id: targetUserId,
        new_values: { reason, passwordReset: resetPassword } as object,
      },
    });

    return {
      success: true,
      message: `User ${targetUser.fullName} has been logged out${resetPassword ? ' and password reset' : ''}`,
      newPassword,
    };
  }

  // ============================================
  // ADMIN: GET ALL ACTIVE SESSIONS
  // ============================================
  async getAllActiveSessions(filters?: { userId?: string; role?: UserRole }): Promise<any[]> {
    const where: any = { isActive: true };
    
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    
    const sessions = await prisma.session.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            isBlocked: true,
          },
        },
      },
      orderBy: { loginTime: 'desc' },
    });

    // Filter by role if specified
    let filteredSessions = sessions;
    if (filters?.role) {
      filteredSessions = sessions.filter(s => s.user.role === filters.role);
    }

    return filteredSessions.map(session => ({
      id: session.id,
      user: session.user,
      deviceInfo: session.deviceInfo ? JSON.parse(session.deviceInfo as string) : null,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      loginTime: session.loginTime,
      lastActivity: session.lastActivity,
      isActive: session.isActive,
      forcedLogoutBy: session.forcedLogoutBy,
      forcedLogoutReason: session.forcedLogoutReason,
    }));
  }

  // ============================================
  // ADMIN: GET USER LOGIN HISTORY
  // ============================================
  async getUserLoginHistory(userId: string, limit: number = 50): Promise<any[]> {
    const sessions = await prisma.session.findMany({
      where: { userId: userId },
      orderBy: { loginTime: 'desc' },
      take: limit,
    });

    return sessions.map(session => ({
      id: session.id,
      deviceInfo: session.deviceInfo ? JSON.parse(session.deviceInfo as string) : null,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      loginTime: session.loginTime,
      logoutTime: session.logoutTime,
      lastActivity: session.lastActivity,
      isActive: session.isActive,
      forcedLogoutBy: session.forcedLogoutBy,
      forcedLogoutReason: session.forcedLogoutReason,
    }));
  }

  // ============================================
  // ADMIN: BLOCK/UNBLOCK USER
  // ============================================
  async toggleUserBlock(
    targetUserId: string,
    adminId: string,
    block: boolean,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    
    if (!targetUser) {
      return { success: false, message: 'User not found' };
    }

    if (targetUser.role === 'admin') {
      return { success: false, message: 'Cannot block another admin' };
    }

    if (block) {
      // Block the user
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          isBlocked: true,
          blockReason: reason || 'Blocked by administrator',
          blocked_at: new Date(),
          blocked_by: adminId,
        },
      });

      // Also force logout if they're logged in
      if (targetUser.isLoggedIn) {
        await this.forceLogout(targetUserId, adminId, 'Account blocked by administrator', false);
      }

      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'BLOCK_USER',
          entityType: 'user',
          entity_id: targetUserId,
          new_values: { reason: reason || 'Blocked by administrator' } as object,
        },
      });

      return { success: true, message: `User ${targetUser.fullName} has been blocked` };
    } else {
      // Unblock the user
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          isBlocked: false,
          blockReason: null,
          blocked_at: null,
          blocked_by: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'UNBLOCK_USER',
          entityType: 'user',
          entity_id: targetUserId,
        },
      });

      return { success: true, message: `User ${targetUser.fullName} has been unblocked` };
    }
  }

  // ============================================
  // ADMIN: RESET USER PASSWORD
  // ============================================
  async adminResetPassword(
    targetUserId: string,
    adminId: string
  ): Promise<{ success: boolean; message: string; newPassword?: string }> {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    
    if (!targetUser) {
      return { success: false, message: 'User not found' };
    }

    if (targetUser.role === 'admin' && targetUser.id !== adminId) {
      return { success: false, message: 'Cannot reset password for another admin' };
    }

    // Generate new password
    const newPassword = this.generateSecurePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Force logout if logged in
    if (targetUser.isLoggedIn) {
      await this.forceLogout(targetUserId, adminId, 'Password reset by administrator', false);
    }

    // Update password
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash: hashedPassword,
        password_changed_at: new Date(),
        passwordResetToken: null,
        password_reset_expires: null,
      },
    });

    // Send email with new credentials
    await sendNewCredentialsEmail(targetUser.email, targetUser.username, newPassword);

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'ADMIN_RESET_PASSWORD',
        entityType: 'user',
        entity_id: targetUserId,
      },
    });

    return {
      success: true,
      message: `Password reset for ${targetUser.fullName}. New credentials sent to email.`,
      newPassword, // Only returned to admin, not to API response
    };
  }

  // ============================================
  // GENERATE SECURE PASSWORD
  // ============================================
  private generateSecurePassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

export const authService = new AuthService();
