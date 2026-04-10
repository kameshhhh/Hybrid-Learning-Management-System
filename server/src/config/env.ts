// Environment configuration with validation
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '24h',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  
  // Session Configuration
  SESSION_TIMEOUT_HOURS: parseInt(process.env.SESSION_TIMEOUT_HOURS || '24', 10),
  MAX_FAILED_LOGIN_ATTEMPTS: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5', 10),
  ACCOUNT_LOCKOUT_MINUTES: parseInt(process.env.ACCOUNT_LOCKOUT_MINUTES || '30', 10),
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // Email (for password reset)
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@skillcourse.com',
  
  // Frontend URL
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};

// Validate required env vars in production
if (env.NODE_ENV === 'production') {
  if (!env.JWT_SECRET || env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    console.error('❌ JWT_SECRET must be set in production');
    process.exit(1);
  }
}
