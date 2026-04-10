/**
 * ============================================================
 * HLMS - TypeScript Type Definitions
 * ============================================================
 *
 * This file contains all TypeScript interfaces and types that
 * mirror the database schema defined in the SRS. These types
 * ensure type safety throughout the frontend application.
 *
 * The types are organized by:
 * 1. User & Authentication
 * 2. Skills & Content
 * 3. Tasks & Assessments
 * 4. Progress & Certificates
 * 5. Groups & Assignments
 * 6. API Response Types
 *
 * ============================================================
 */

// ============================================================
// 1. USER & AUTHENTICATION TYPES
// ============================================================

/**
 * UserRole - The three user roles in the system
 * - admin: Full system control, can manage everything
 * - faculty: Creates content, assesses students (assigned skills only)
 * - student: Views content, submits tasks (assigned skills only)
 */
export type UserRole = "admin" | "faculty" | "student";

/**
 * User - Core user entity matching the database users table
 * Contains all user information including status and device tracking
 */
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  rollNumber?: string; // Only for students

  // Account Status
  isActive: boolean;
  isBlocked: boolean;
  blockReason?: string;
  blockedAt?: string;
  blockedBy?: string;

  // Device Management (for single-device login)
  isLoggedIn: boolean;
  currentSessionId?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginDevice?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * LoginCredentials - Data sent during login
 */
export interface LoginCredentials {
  identifier: string;
  password: string;
}

/**
 * AuthResponse - Response from login API
 */
export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  // For "already logged in" scenario
  currentDevice?: string;
  lastLogin?: string;
}

/**
 * Session - Represents an active user session
 */
export interface Session {
  id: string;
  userId: string;
  sessionToken: string;
  deviceInfo?: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  loginTime: string;
  lastActivity: string;
  logoutTime?: string;
  isActive: boolean;
  forcedLogoutBy?: string;
  forcedLogoutReason?: string;
}

// ============================================================
// 2. SKILLS & CONTENT TYPES
// ============================================================

/**
 * SkillStatus - The lifecycle status of a skill
 * - draft: Being created, not visible to students
 * - pending_approval: Submitted for admin review
 * - approved: Ready for use
 * - rejected: Needs revision
 * - active: Currently being used by students
 * - archived: No longer active, kept for records
 */
export type SkillStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "active"
  | "archived";

/**
 * Skill - Main skill entity containing all course information
 */
export interface Skill {
  id: string;
  skillCode: string;
  name: string;
  description?: string;
  durationWeeks: number;
  totalTasks: number;
  totalChapters: number;
  totalLessons: number;

  // Status
  status: SkillStatus;
  rejectionReason?: string;
  approvedAt?: string;
  approvedBy?: string;

  // Media
  thumbnailUrl?: string;
  coverImageUrl?: string;

  // Audit
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Relationships (populated when needed)
  chapters?: Chapter[];
  faculty?: SkillFaculty[];
}

/**
 * SkillFaculty - Junction table for skill-faculty assignments
 * Tracks which faculty members are assigned to which skills
 */
export interface SkillFaculty {
  id: string;
  skillId: string;
  facultyId: string;
  assignedBy?: string;
  assignedAt: string;
  isPrimary: boolean; // Primary faculty has edit rights
  isActive: boolean;
  removedAt?: string;
  removedBy?: string;
  removalReason?: string;

  // Populated
  faculty?: User;
}

/**
 * ContentStatus - Status for chapters, lessons, tasks
 */
export type ContentStatus = "draft" | "pending_approval" | "approved";

/**
 * Chapter - A section within a skill containing lessons
 */
export interface Chapter {
  id: string;
  skillId: string;
  title: string;
  description?: string;
  chapterNumber: number;
  status: ContentStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Relationships
  lessons?: Lesson[];
}

/**
 * Lesson - Individual learning unit with video content
 */
export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  description?: string;
  lessonNumber: number;

  // Video Content
  videoUrl?: string;
  videoDuration?: number; // In seconds
  videoSize?: number; // In bytes
  videoFormat?: string; // mp4, webm, etc.
  videoResolution?: string; // 720p, 1080p, etc.
  videoThumbnail?: string;

  // Additional Materials
  pdfUrl?: string;
  pdfSize?: number;
  attachmentUrls?: string[]; // Array of additional resources

  // Video Validation
  isVideoValidated: boolean;
  videoValidationMessage?: string;
  videoValidatedAt?: string;
  videoValidatedBy?: string;

  // Status
  status: ContentStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * VideoValidationResult - Result from video validation service
 */
export interface VideoValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    fileSize?: number;
    duration?: number;
    resolution?: string;
    aspectRatio?: string;
    format?: string;
    hasAudio?: boolean;
  };
}

// ============================================================
// 3. TASKS & ASSESSMENTS TYPES
// ============================================================

/**
 * SubmissionType - How students submit their work
 */
export type SubmissionType = "file" | "text" | "both";

/**
 * RubricCriterion - A single criterion in the rubric
 * Used for consistent, weighted grading
 */
export interface RubricCriterion {
  name: string;
  weight: number; // Points allocated (must sum to maxMarks)
  maxScore: number;
  description?: string;
}

/**
 * Task - Daily task for students to complete
 * Max marks is capped at 10 as per SRS
 */
export interface Task {
  id: string;
  skillId: string;
  dayNumber: number; // Day number
  title: string;
  description?: string;

  // Assessment
  maxMarks: number; // Max 10
  passingMarks: number;
  rubric: RubricCriterion[];

  // Submission
  submissionType: SubmissionType;
  allowedFileTypes: string[];
  maxFileSize: number; // In bytes
  deadlineDays: number; // Days from task assignment

  // Status
  status: ContentStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * RubricScore - Individual criterion score in an assessment
 */
export interface RubricScore {
  criterion: string;
  maxScore: number;
  scoreObtained: number;
  percentage: number;
}

/**
 * DailyAssessment - A student's submission and assessment for a task
 */
export interface DailyAssessment {
  id: string;
  studentId: string;
  taskId: string;
  skillId: string;

  // Submission
  submissionText?: string;
  submissionFileUrl?: string;
  submittedAt: string;

  // Assessment
  marksObtained?: number;
  rubricScores?: RubricScore[];
  facultyFeedback?: string;
  assessedBy?: string;
  assessedAt?: string;

  // Status
  isLate: boolean;
  isResubmitted: boolean;
  previousSubmissionId?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Populated
  task?: Task;
  student?: User;
  assessor?: User;
}

// ============================================================
// 4. PROGRESS & CERTIFICATES TYPES
// ============================================================

/**
 * StudentSkillStatus - Student's status in a skill
 */
export type StudentSkillStatus = "active" | "dropped" | "completed";

/**
 * StudentSkill - Tracks a student's enrollment and progress in a skill
 */
export interface StudentSkill {
  id: string;
  studentId: string;
  skillId: string;
  assignedBy?: string;
  assignedAt: string;
  groupId?: string;

  // Status
  status: StudentSkillStatus;
  droppedAt?: string;
  dropReason?: string;

  // Progress (denormalized for performance)
  totalTasksCompleted: number;
  totalMarksObtained: number;
  progressPercentage: number;

  // Completion
  completedAt?: string;
  certificateUrl?: string;

  // Populated
  skill?: Skill;
  student?: User;
}

/**
 * LessonProgress - Tracks a student's video watching progress
 */
export interface LessonProgress {
  id: string;
  studentId: string;
  lessonId: string;
  skillId: string;

  // Video Progress
  videoWatchedPercentage: number;
  lastWatchPosition: number; // In seconds
  isVideoCompleted: boolean;

  // Lesson Status
  isCompleted: boolean;
  completedAt?: string;

  // Watch Stats
  firstWatchedAt?: string;
  lastWatchedAt?: string;
  totalWatchCount: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * ProgressLog - Weekly progress log submitted by students
 */
export interface ProgressLog {
  id: string;
  studentId: string;
  skillId: string;

  // Log Content
  weekNumber: number;
  logDate: string;
  workDone?: string;
  challengesFaced?: string;
  nextPlan?: string;

  // Faculty Review
  facultyRemarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  isApproved: boolean;

  createdAt: string;
}

/**
 * Certificate - Skill completion certificate
 */
export interface Certificate {
  id: string;
  certificateNumber: string;
  studentId: string;
  skillId: string;

  // Certificate Details
  issueDate: string;
  expiryDate?: string;
  grade?: string;
  totalMarksObtained: number;
  totalMarksPossible: number;
  percentage: number;

  // Files
  pdfUrl: string;
  qrCodeUrl?: string;
  qrCodeData?: string;

  // Verification
  verificationCode: string;
  isVerified: boolean;
  verifiedCount: number;

  // Audit
  generatedBy?: string;
  generatedAt: string;

  // Populated
  student?: User;
  skill?: Skill;
}

// ============================================================
// 5. GROUPS & ASSIGNMENTS TYPES
// ============================================================

/**
 * GroupType - Different types of student groups
 */
export type GroupType = "team" | "college" | "batch" | "class";

/**
 * Group - Container for organizing students
 */
export interface Group {
  id: string;
  groupCode: string;
  name: string;
  type: GroupType;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;

  // Populated
  members?: GroupMember[];
  memberCount?: number;
}

/**
 * GroupMember - Junction table for group memberships
 */
export interface GroupMember {
  id: string;
  groupId: string;
  studentId: string;
  joinedAt: string;
  leftAt?: string;
  isActive: boolean;

  // Populated
  student?: User;
}

/**
 * SkillGroupAssignment - Assigns a skill to an entire group
 */
export interface SkillGroupAssignment {
  id: string;
  skillId: string;
  groupId: string;
  assignedBy?: string;
  assignedAt: string;

  // Populated
  skill?: Skill;
  group?: Group;
}

// ============================================================
// 6. NOTIFICATION & AUDIT TYPES
// ============================================================

/**
 * NotificationType - Types of notifications
 */
export type NotificationType = "info" | "success" | "warning" | "error";

/**
 * Notification - User notification
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  createdAt: string;
}

/**
 * AuditLog - Tracks all important actions in the system
 */
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string; // 'skill', 'task', 'student', etc.
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;

  // Populated
  user?: User;
}

// ============================================================
// 7. API RESPONSE TYPES
// ============================================================

/**
 * ApiResponse - Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * PaginatedResponse - Response with pagination
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * ValidationError - Field-level validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================
// 8. FORM DATA TYPES
// ============================================================

/**
 * CreateStudentData - Form data for creating a student
 */
export interface CreateStudentData {
  fullName: string;
  email: string;
  phone?: string;
  username: string;
  password: string;
  confirmPassword: string;
  rollNumber: string;
  groupId?: string;
  skillIds?: string[];
}

/**
 * CreateSkillData - Form data for creating a skill
 */
export interface CreateSkillData {
  skillCode: string;
  name: string;
  description: string;
  durationWeeks: number;
  facultyIds: string[];
  primaryFacultyId?: string;
  thumbnail?: File;
}

/**
 * CreateChapterData - Form data for creating a chapter
 */
export interface CreateChapterData {
  skillId: string;
  title: string;
  description?: string;
  chapterNumber: number;
}

/**
 * CreateLessonData - Form data for creating a lesson
 */
export interface CreateLessonData {
  chapterId: string;
  title: string;
  description?: string;
  lessonNumber: number;
  video: File;
  pdf?: File;
  attachments?: File[];
}

/**
 * CreateTaskData - Form data for creating a task
 */
export interface CreateTaskData {
  skillId: string;
  dayNumber: number;
  title: string;
  description?: string;
  maxMarks: number;
  passingMarks: number;
  rubric: RubricCriterion[];
  submissionType: SubmissionType;
  allowedFileTypes: string[];
  maxFileSize: number;
  deadlineDays: number;
}

/**
 * SubmitAssessmentData - Form data for faculty marking
 */
export interface SubmitAssessmentData {
  studentId: string;
  taskId: string;
  scores: number[];
  feedback?: string;
}

/**
 * StudentSubmissionData - Form data for student submission
 */
export interface StudentSubmissionData {
  taskId: string;
  text?: string;
  file?: File;
}

// ============================================================
// 9. DASHBOARD & STATISTICS TYPES
// ============================================================

/**
 * AdminDashboardStats - Statistics for admin dashboard
 */
export interface AdminDashboardStats {
  totalSkills: number;
  activeSkills: number;
  totalStudents: number;
  totalFaculty: number;
  completedSkills: number;
  pendingApprovals: number;
  recentActivities: Activity[];
}

/**
 * FacultyDashboardStats - Statistics for faculty dashboard
 */
export interface FacultyDashboardStats {
  assignedSkills: number;
  totalStudents: number;
  pendingAssessments: number;
  completedAssessments: number;
  recentSubmissions: DailyAssessment[];
}

/**
 * StudentDashboardStats - Statistics for student dashboard
 */
export interface StudentDashboardStats {
  enrolledSkills: number;
  completedSkills: number;
  overallProgress: number;
  upcomingTasks: Task[];
  recentMarks: DailyAssessment[];
  certificates: Certificate[];
}

/**
 * Activity - Recent activity item
 */
export interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  userId?: string;
  user?: User;
}

// ============================================================
// 10. REPORT TYPES
// ============================================================

/**
 * ReportFilters - Common filters for reports
 */
export interface ReportFilters {
  skillId?: string;
  groupId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  facultyId?: string;
}

/**
 * ExportFormat - Available export formats
 */
export type ExportFormat = "csv" | "excel" | "pdf" | "json";

/**
 * SkillCompletionReport - Skill completion report data
 */
export interface SkillCompletionReport {
  skillName: string;
  skillCode: string;
  totalEnrolled: number;
  totalCompleted: number;
  completionRate: number;
  averageMarks: number;
  students: {
    name: string;
    email: string;
    rollNumber: string;
    completedAt?: string;
    marks: number;
  }[];
}

/**
 * StudentProgressReport - Individual student progress report
 */
export interface StudentProgressReport {
  student: User;
  skills: {
    skill: Skill;
    progress: number;
    tasksCompleted: number;
    totalTasks: number;
    marks: number;
    status: StudentSkillStatus;
  }[];
}
