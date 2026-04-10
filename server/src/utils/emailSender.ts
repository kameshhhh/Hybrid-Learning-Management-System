import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Email transporter configuration
let transporter: nodemailer.Transporter | null = null;

let etherealUrl = "";

async function getTransporter() {
  if (!transporter) {
    if (env.SMTP_USER === "your-email@gmail.com" || !env.SMTP_HOST) {
      console.log("Using Ethereal Email for testing...");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      etherealUrl = `https://ethereal.email/login`;
      console.log(`Ethereal Test Account generated. View emails at: ${etherealUrl}`);
    } else {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }
  return transporter;
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, resetToken: string, username: string): Promise<boolean> {
  try {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset Request - SkillCourse',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>We received a request to reset your password for your SkillCourse account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
          <p>This link will expire in <strong>1 hour</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 24px 0; border-color: #eee;">
          <p style="color: #666; font-size: 12px;">SkillCourse Learning Platform</p>
        </div>
      `,
    };
    
    const t = await getTransporter();
    await t.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
}

// Send new credentials email (when admin resets password)
export async function sendNewCredentialsEmail(email: string, username: string, newPassword: string): Promise<boolean> {
  try {
    const mailOptions = {
      from: env.EMAIL_FROM,
      to: email,
      subject: 'Your Password Has Been Reset - SkillCourse',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset by Administrator</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>An administrator has reset your password for your SkillCourse account.</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>New Login Credentials:</strong></p>
            <p style="margin: 4px 0;">Username: <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${username}</code></p>
            <p style="margin: 4px 0;">Password: <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${newPassword}</code></p>
          </div>
          <p>Please log in and change your password immediately.</p>
          <a href="${env.FRONTEND_URL}/login" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Login to Account</a>
          <hr style="margin: 24px 0; border-color: #eee;">
          <p style="color: #666; font-size: 12px;">SkillCourse Learning Platform</p>
        </div>
      `,
    };
    
    const t = await getTransporter();
    await t.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
}

// Send welcome email with credentials
export async function sendWelcomeEmail(email: string, username: string, password: string, fullName: string): Promise<boolean> {
  try {
    const mailOptions = {
      from: env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to SkillCourse - Your Account Details',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to SkillCourse, ${fullName}!</h2>
          <p>Your account has been created successfully.</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Your Login Credentials:</strong></p>
            <p style="margin: 4px 0;">Username: <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${username}</code></p>
            <p style="margin: 4px 0;">Password: <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
          </div>
          <p>Please log in and change your password after first login.</p>
          <a href="${env.FRONTEND_URL}/login" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Login to Account</a>
          <hr style="margin: 24px 0; border-color: #eee;">
          <p style="color: #666; font-size: 12px;">SkillCourse Learning Platform</p>
        </div>
      `,
    };
    
    const t = await getTransporter();
    await t.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
}
