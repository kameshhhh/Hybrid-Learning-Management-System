import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { parseDeviceInfo } from '../utils/deviceDetector';

export class AuthController {
  
  // ============================================
  // LOGIN
  // ============================================
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: 'Username and password are required' }
        });
      }
      
      const deviceInfo = parseDeviceInfo(req);
      const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
      
      const result = await authService.login(username, password, deviceInfo, ipAddress);
      
      if (!result.success) {
        // Check if it's a device conflict
        if (result.currentDevice) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'AUTH_003',
              message: result.error,
              currentDevice: result.currentDevice,
              lastLogin: result.lastLogin
            }
          });
        }
        
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_001', message: result.error }
        });
      }
      
      return res.status(200).json({
        success: true,
        data: {
          token: result.token,
          refreshToken: result.refreshToken,
          user: result.user
        }
      });
      
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
  
  // ============================================
  // LOGOUT
  // ============================================
  async logout(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const sessionToken = req.headers['x-session-token'] as string;
      
      if (!userId || !sessionToken) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: 'Invalid session' }
        });
      }
      
      await authService.logout(userId, sessionToken);
      
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
      
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
  
  // ============================================
  // REFRESH TOKEN
  // ============================================
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: 'Refresh token required' }
        });
      }
      
      const result = await authService.refreshToken(refreshToken);
      
      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_002', message: result.error }
        });
      }
      
      return res.status(200).json({
        success: true,
        data: { token: result.token }
      });
      
    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
  
  // ============================================
  // CHANGE PASSWORD
  // ============================================
  async changePassword(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: 'Current password and new password are required' }
        });
      }
      
      // Password validation
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: 'Password must be at least 8 characters' }
        });
      }
      
      const result = await authService.changePassword(userId!, currentPassword, newPassword);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: result.error }
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
      
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
  
  // ============================================
  // REQUEST PASSWORD RESET (Forgot Password)
  // ============================================
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: 'Email is required' }
        });
      }
      
      const result = await authService.requestPasswordReset(email);
      
      return res.status(200).json({
        success: true,
        message: result.message
      });
      
    } catch (error) {
      console.error('Request reset error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
  
  // ============================================
  // RESET PASSWORD (With Token)
  // ============================================
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: 'Token and new password are required' }
        });
      }
      
      // Password validation
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: 'Password must be at least 8 characters' }
        });
      }
      
      const result = await authService.resetPassword(token, newPassword);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALID_001', message: result.error }
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Password reset successfully. Please login with your new password.'
      });
      
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
  
  // ============================================
  // GET CURRENT USER
  // ============================================
  async getCurrentUser(req: Request, res: Response) {
    try {
      return res.status(200).json({
        success: true,
        data: req.user
      });
      
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_001', message: 'Internal server error' }
      });
    }
  }
}

export const authController = new AuthController();
