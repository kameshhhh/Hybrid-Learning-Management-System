// ============================================================
// CERTIFICATE GENERATION SERVICE
// ============================================================
//
// Generates skill completion certificates per SRS requirements:
// - PDF format using PDFKit
// - Includes QR code for verification
// - Contains: Student name, skill name, completion date, certificate ID
// - QR links to verification endpoint
//
// ============================================================

import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";
import prisma from "../config/database";
import { generateCertificateId } from "../utils/generators";

// ===================
// TYPE DEFINITIONS
// ===================

export interface CertificateData {
  studentName: string;
  rollNumber: string;
  skillName: string;
  skillCode: string;
  completionDate: Date;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  facultyName: string;
  certificateId: string;
}

export interface CertificateResult {
  success: boolean;
  certificateId: string;
  filePath: string | null;
  error?: string;
}

// ===================
// MAIN GENERATION FUNCTION
// ===================

/**
 * Generate a certificate PDF for a completed skill enrollment
 *
 * @param enrollmentId - The skill enrollment ID
 * @returns Promise<CertificateResult>
 */
export async function generateCertificate(
  enrollmentId: string,
): Promise<CertificateResult> {
  try {
    // Fetch enrollment data with relations
    // Using StudentSkill model as defined in the schema
    const enrollment = await prisma.studentSkill.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        skill: {
          include: {
            faculty: {
              include: {
                faculty: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!enrollment) {
      return {
        success: false,
        certificateId: "",
        filePath: null,
        error: "Enrollment not found",
      };
    }

    if (enrollment.status !== "completed") {
      return {
        success: false,
        certificateId: "",
        filePath: null,
        error: "Skill not completed yet",
      };
    }

    // Generate certificate ID
    const certificateId = generateCertificateId();

    // Calculate marks and grade using DailyAssessment
    const submissions = await prisma.dailyAssessment.findMany({
      where: {
        studentId: enrollment.studentId,
        skillId: enrollment.skillId,
        assessedAt: { not: null },
      },
      include: {
        task: true,
      },
    });

    let totalMarks = 0;
    let obtainedMarks = 0;

    for (const sub of submissions) {
      totalMarks += sub.task.maxMarks;
      // marksObtained is Decimal type in schema
      obtainedMarks += sub.marksObtained ? Number(sub.marksObtained) : 0;
    }

    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
    const grade = calculateGrade(percentage);

    // Get faculty name
    const facultyAssignment = enrollment.skill.faculty[0];
    const facultyName = facultyAssignment?.faculty?.fullName || "Faculty";

    // Prepare certificate data
    const certData: CertificateData = {
      studentName: enrollment.student.fullName,
      rollNumber: enrollment.student.rollNumber || "",
      skillName: enrollment.skill.name,
      skillCode: enrollment.skill.skillCode,
      completionDate: enrollment.completedAt || new Date(),
      totalMarks,
      obtainedMarks,
      percentage,
      grade,
      facultyName,
      certificateId,
    };

    // Generate PDF
    const uploadsDir = path.join(process.cwd(), "uploads", "certificates");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, `${certificateId}.pdf`);
    await createCertificatePDF(certData, filePath);

    // Save certificate record in database
    await prisma.skillCertificate.create({
      data: {
        certificateNumber: certificateId,
        studentId: enrollment.studentId,
        skillId: enrollment.skillId,
        issueDate: new Date(),
        pdfUrl: `/uploads/certificates/${certificateId}.pdf`,
        grade,
        percentage,
        totalMarksObtained: obtainedMarks,
        totalMarksPossible: totalMarks,
        verificationCode: certificateId,
        qrCodeData: `${process.env.FRONTEND_URL}/verify/${certificateId}`,
      },
    });

    logger.info({
      message: "Certificate generated",
      certificateId,
      studentId: enrollment.studentId,
      skillId: enrollment.skillId,
    });

    return {
      success: true,
      certificateId,
      filePath,
    };
  } catch (error) {
    logger.error("Certificate generation error:", error);
    return {
      success: false,
      certificateId: "",
      filePath: null,
      error: "Failed to generate certificate",
    };
  }
}

// ===================
// PDF CREATION
// ===================

/**
 * Create the actual PDF certificate
 */
async function createCertificatePDF(
  data: CertificateData,
  outputPath: string,
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create PDF document (A4 landscape)
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 50,
      });

      // Pipe to file
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Draw decorative border
      drawBorder(doc, pageWidth, pageHeight);

      // Header - Institution name
      doc
        .fontSize(14)
        .fillColor("#666666")
        .text("HYBRID LEARNING MANAGEMENT SYSTEM", 0, 60, { align: "center" });

      // Title
      doc
        .fontSize(36)
        .fillColor("#1a1a1a")
        .font("Helvetica-Bold")
        .text("Certificate of Completion", 0, 100, { align: "center" });

      // Decorative line
      doc
        .moveTo(250, 150)
        .lineTo(pageWidth - 250, 150)
        .strokeColor("#8b5cf6")
        .lineWidth(2)
        .stroke();

      // Main text
      doc
        .fontSize(14)
        .fillColor("#333333")
        .font("Helvetica")
        .text("This is to certify that", 0, 180, { align: "center" });

      // Student name
      doc
        .fontSize(28)
        .fillColor("#1a1a1a")
        .font("Helvetica-Bold")
        .text(data.studentName, 0, 210, { align: "center" });

      // Roll number
      doc
        .fontSize(12)
        .fillColor("#666666")
        .font("Helvetica")
        .text(`(Roll Number: ${data.rollNumber})`, 0, 250, { align: "center" });

      // Completion text
      doc
        .fontSize(14)
        .fillColor("#333333")
        .text("has successfully completed the skill course", 0, 285, {
          align: "center",
        });

      // Skill name
      doc
        .fontSize(24)
        .fillColor("#8b5cf6")
        .font("Helvetica-Bold")
        .text(data.skillName, 0, 315, { align: "center" });

      // Skill code
      doc
        .fontSize(12)
        .fillColor("#666666")
        .font("Helvetica")
        .text(`(Code: ${data.skillCode})`, 0, 350, { align: "center" });

      // Performance details
      doc
        .fontSize(12)
        .fillColor("#333333")
        .text(
          `with a score of ${data.obtainedMarks}/${data.totalMarks} (${data.percentage.toFixed(1)}%)`,
          0,
          385,
          { align: "center" },
        );

      // Grade
      doc
        .fontSize(16)
        .fillColor(getGradeColor(data.grade))
        .font("Helvetica-Bold")
        .text(`Grade: ${data.grade}`, 0, 410, { align: "center" });

      // Generate QR code
      const verificationUrl = `${process.env.FRONTEND_URL}/verify/${data.certificateId}`;
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 80 });
      const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

      // Add QR code to bottom right
      doc.image(qrBuffer, pageWidth - 130, pageHeight - 130, { width: 80 });
      doc
        .fontSize(8)
        .fillColor("#666666")
        .text("Scan to verify", pageWidth - 130, pageHeight - 45, {
          width: 80,
          align: "center",
        });

      // Date and certificate ID
      const dateStr = data.completionDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      doc
        .fontSize(10)
        .fillColor("#666666")
        .text(`Date of Completion: ${dateStr}`, 50, pageHeight - 100);

      doc.text(`Certificate ID: ${data.certificateId}`, 50, pageHeight - 85);

      // Signature section
      doc
        .moveTo(pageWidth - 300, pageHeight - 90)
        .lineTo(pageWidth - 150, pageHeight - 90)
        .strokeColor("#333333")
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(10)
        .fillColor("#333333")
        .text(data.facultyName, pageWidth - 300, pageHeight - 85, {
          width: 150,
          align: "center",
        });

      doc
        .fontSize(8)
        .fillColor("#666666")
        .text("Faculty In-Charge", pageWidth - 300, pageHeight - 70, {
          width: 150,
          align: "center",
        });

      // Finalize document
      doc.end();

      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Draw decorative border around certificate
 */
function drawBorder(
  doc: PDFKit.PDFDocument,
  width: number,
  height: number,
): void {
  const margin = 30;
  const innerMargin = 40;

  // Outer border
  doc
    .rect(margin, margin, width - 2 * margin, height - 2 * margin)
    .strokeColor("#8b5cf6")
    .lineWidth(3)
    .stroke();

  // Inner border
  doc
    .rect(
      innerMargin,
      innerMargin,
      width - 2 * innerMargin,
      height - 2 * innerMargin,
    )
    .strokeColor("#c4b5fd")
    .lineWidth(1)
    .stroke();

  // Corner decorations
  const cornerSize = 20;
  const corners = [
    [margin + 5, margin + 5],
    [width - margin - cornerSize - 5, margin + 5],
    [margin + 5, height - margin - cornerSize - 5],
    [width - margin - cornerSize - 5, height - margin - cornerSize - 5],
  ];

  corners.forEach(([x, y]) => {
    doc.rect(x, y, cornerSize, cornerSize).fillColor("#f3e8ff").fill();
  });
}

// ===================
// HELPER FUNCTIONS
// ===================

/**
 * Calculate grade based on percentage
 */
function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

/**
 * Get color for grade display
 */
function getGradeColor(grade: string): string {
  switch (grade) {
    case "A+":
    case "A":
      return "#22c55e"; // Green
    case "B+":
    case "B":
      return "#3b82f6"; // Blue
    case "C":
      return "#f59e0b"; // Orange
    case "D":
      return "#ef4444"; // Red
    default:
      return "#666666"; // Gray
  }
}

// ===================
// VERIFICATION
// ===================

/**
 * Verify a certificate by its ID
 */
export async function verifyCertificate(certificateId: string) {
  const cert = await prisma.skillCertificate.findUnique({
    where: { certificateNumber: certificateId },
    include: {
      student: {
        select: { fullName: true, rollNumber: true },
      },
      skill: {
        select: { name: true, code: true },
      },
    },
  });

  if (!cert) {
    return { valid: false, message: "Certificate not found" };
  }

  if (!cert.isVerified) {
    return { valid: false, message: "Certificate has been revoked" };
  }

  // Increment verification count
  await prisma.skillCertificate.update({
    where: { id: cert.id },
    data: { verifiedCount: { increment: 1 } },
  });

  return {
    valid: true,
    certificate: {
      certificateId: cert.certificateNumber,
      studentName: cert.student.fullName,
      rollNumber: cert.student.rollNumber,
      skillName: cert.skill.name,
      skillCode: cert.skill.code,
      issuedAt: cert.issueDate,
      grade: cert.grade,
      percentage: cert.percentage,
    },
  };
}
