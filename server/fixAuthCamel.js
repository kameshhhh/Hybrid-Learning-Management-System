import fs from 'fs';
import path from 'path';

const filesToFix = [
  'src/services/authService.ts',
  'src/controllers/adminSessionController.ts',
  'src/controllers/authController.ts',
  'src/middleware/authMiddleware.ts',
];

for (const file of filesToFix) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace snake_case properties to camelCase based on tsc.log
  const replacements = {
    'is_blocked': 'isBlocked',
    'block_reason': 'blockReason',
    'locked_until': 'lockedUntil',
    'password_hash': 'passwordHash',
    'is_logged_in': 'isLoggedIn',
    'user_id': 'userId',
    'login_time': 'loginTime',
    'device_info': 'deviceInfo',
    'device_type': 'deviceType',
    'ip_address': 'ipAddress',
    'logout_time': 'logoutTime',
    'last_activity': 'lastActivity',
    'is_active': 'isActive',
    'forced_logout_by': 'forcedLogoutBy',
    'forced_logout_reason': 'forcedLogoutReason',
    'full_name': 'fullName',
    'failed_login_attempts': 'failedLoginAttempts',
    'session_token': 'sessionToken',
    'password_reset_token': 'passwordResetToken',
  };

  for (const [snake, camel] of Object.entries(replacements)) {
    // Basic replace using regex to match property access or object keys
    content = content.replace(new RegExp(`\\b${snake}\\b`, 'g'), camel);
  }

  // Also fix authMiddleware.ts interface user type issue
  if (file.includes('authMiddleware.ts')) {
    content = content.replace('id: string; username: string; email: string; fullName: string; role: string; isActive: boolean; isBlocked: boolean;', 'id: string; username: string; email: string; fullName: string; role: string;');
    // In authMiddleware.ts, the req.user type needs to be correctly extended.
  }

  fs.writeFileSync(file, content);
}
console.log('Fixed camelCase in new auth files!');
