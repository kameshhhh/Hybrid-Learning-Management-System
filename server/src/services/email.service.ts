// ============================================================
// EMAIL SERVICE
// ============================================================
//
// Handles email notifications for the HLMS system:
// - Welcome emails with credentials
// - Password reset
// - Task notifications
// - Certificate issued notifications
//
// Uses Nodemailer with configurable SMTP transport.
// ============================================================

import nodemailer from "nodemailer";
import { logger } from "../utils/logger";

// ===================
// TYPE DEFINITIONS
// ===================

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ===================
// TRANSPORT SETUP
// ===================

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;
let etherealUrl = "";

export const initTransporter = async () => {
  if (process.env.SMTP_USER === "your-email@gmail.com" || !process.env.SMTP_HOST) {
    logger.info("Using Ethereal Email for testing...");
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
    logger.info(`Ethereal Test Account generated. You can view emails at: ${etherealUrl}`);
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
};

// Initialize immediately
initTransporter();

// ===================
// CORE SEND FUNCTION
// ===================

export async function sendEmail(options: EmailOptions): Promise<SendResult> {
  try {
    // Ensure transporter is initialized
    if (!transporter) {
      await initTransporter();
    }
    
    // If still no transporter after init attempt, log email instead
    if (!transporter) {
      logger.info({
        message: "Email logged (SMTP not configured)",
        to: options.to,
        subject: options.subject,
        text: options.text?.substring(0, 200),
      });
      return { success: true, messageId: "logged" };
    }

    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || "HLMS <noreply@hlms.com>",
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    logger.info({
      message: "Email sent",
      to: options.to,
      subject: options.subject,
      messageId: result.messageId,
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

// ===================
// EMAIL TEMPLATES
// ===================

/**
 * Send welcome email with credentials to new user
 */
export async function sendWelcomeEmail(
  email: string,
  fullName: string,
  username: string,
  password: string,
  role: string,
): Promise<SendResult> {
  const subject = "Welcome to HLMS - Your Account Details";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
        .credentials p { margin: 10px 0; }
        .credentials strong { color: #1f2937; }
        .btn { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to HLMS!</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${fullName}</strong>,</p>
          <p>Your account has been created successfully. You can now access the Hybrid Learning Management System as a <strong>${role}</strong>.</p>
          
          <div class="credentials">
            <h3>Your Login Credentials</h3>
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <p><strong>Important:</strong> Please change your password after your first login for security.</p>
          
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/login" class="btn">Login to HLMS</a>
          </p>
          
          <div class="footer">
            <p>If you did not request this account, please contact the administrator.</p>
            <p>&copy; ${new Date().getFullYear()} Hybrid Learning Management System</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to HLMS!

Dear ${fullName},

Your account has been created successfully. You can now access the Hybrid Learning Management System as a ${role}.

Your Login Credentials:
- Username: ${username}
- Password: ${password}

Important: Please change your password after your first login for security.

Login at: ${process.env.FRONTEND_URL}/login

If you did not request this account, please contact the administrator.
  `;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  fullName: string,
  resetToken: string,
): Promise<SendResult> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const subject = "HLMS - Password Reset Request";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .warning { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${fullName}</strong>,</p>
          <p>We received a request to reset your password for your HLMS account.</p>
          
          <p style="text-align: center;">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </p>
          
          <div class="warning">
            <p><strong>Note:</strong> This link will expire in 1 hour. If you did not request this password reset, please ignore this email.</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Hybrid Learning Management System</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Password Reset Request

Dear ${fullName},

We received a request to reset your password for your HLMS account.

Click here to reset your password: ${resetUrl}

Note: This link will expire in 1 hour. If you did not request this password reset, please ignore this email.
  `;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send task submission notification to faculty
 */
export async function sendTaskSubmissionNotification(
  facultyEmail: string,
  facultyName: string,
  studentName: string,
  taskTitle: string,
  skillName: string,
): Promise<SendResult> {
  const subject = `HLMS - New Task Submission: ${taskTitle}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>New Task Submission</h2>
        </div>
        <div class="content">
          <p>Dear <strong>${facultyName}</strong>,</p>
          <p>A new task submission requires your evaluation:</p>
          
          <div class="info">
            <p><strong>Student:</strong> ${studentName}</p>
            <p><strong>Task:</strong> ${taskTitle}</p>
            <p><strong>Skill:</strong> ${skillName}</p>
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/faculty/assessments" class="btn">Review Submission</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: facultyEmail, subject, html });
}

/**
 * Send certificate issued notification to student
 */
export async function sendCertificateNotification(
  studentEmail: string,
  studentName: string,
  skillName: string,
  certificateId: string,
): Promise<SendResult> {
  const subject = `HLMS - Certificate Issued: ${skillName}`;
  const certificateUrl = `${process.env.FRONTEND_URL}/certificates/${certificateId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #22c55e, #10b981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Congratulations!</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>Congratulations on successfully completing the skill course:</p>
          
          <h2 style="text-align: center; color: #8b5cf6;">${skillName}</h2>
          
          <p>Your certificate has been generated and is ready for download.</p>
          <p><strong>Certificate ID:</strong> ${certificateId}</p>
          
          <p style="text-align: center;">
            <a href="${certificateUrl}" class="btn">Download Certificate</a>
          </p>
          
          <p>Keep up the great work!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: studentEmail, subject, html });
}

/**
 * Send grade notification to student
 */
export async function sendGradeNotification(
  studentEmail: string,
  studentName: string,
  taskTitle: string,
  marks: number,
  maxMarks: number,
  feedback: string,
): Promise<SendResult> {
  const subject = `HLMS - Task Graded: ${taskTitle}`;
  const percentage = ((marks / maxMarks) * 100).toFixed(1);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .score { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .score h2 { color: #8b5cf6; margin: 0; font-size: 36px; }
        .feedback { background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; }
        .btn { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Task Graded</h2>
        </div>
        <div class="content">
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>Your submission for <strong>${taskTitle}</strong> has been evaluated.</p>
          
          <div class="score">
            <h2>${marks}/${maxMarks}</h2>
            <p>${percentage}%</p>
          </div>
          
          ${
            feedback
              ? `
          <div class="feedback">
            <h4>Faculty Feedback:</h4>
            <p>${feedback}</p>
          </div>
          `
              : ""
          }
          
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/student/grades" class="btn">View All Grades</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: studentEmail, subject, html });
}
