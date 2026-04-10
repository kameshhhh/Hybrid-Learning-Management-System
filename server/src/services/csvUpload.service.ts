// ============================================================
// CSV BULK UPLOAD SERVICE
// ============================================================
//
// Handles bulk student upload via CSV files per SRS requirements:
// - Maximum 1000 rows per file
// - Required columns: fullName, email, rollNumber, phone
// - Optional: groupId
// - Validates all rows before inserting any
// - Creates unique usernames/passwords for each student
//
// ============================================================

import { parse } from "csv-parse";
import { stringify } from "csv-stringify";
import fs from "fs";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { logger } from "../utils/logger";
import prisma from "../config/database";
import { generatePassword, generateUsername } from "../utils/generators";

// ===================
// TYPE DEFINITIONS
// ===================


export interface CSVFacultyRow {
  fullName: string;
  email: string;
  phone: string;
}

export interface CSVStudentRow {
  fullName: string;
  email: string;
  rollNumber: string;
  phone: string;
  groupId?: string;
  dob?: string;
  department?: string;
  yearOfStudy?: string;
  collegeName?: string;
}

export interface CSVValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface CSVUploadResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdCount: number;
  errors: CSVValidationError[];
  credentials: Array<{
    fullName: string;
    email: string;
    rollNumber: string;
    username: string;
    password: string;
  }>;
}

interface PreparedUser {
  data: Prisma.UserCreateInput;
  credentials: {
    fullName: string;
    email: string;
    rollNumber: string;
    username: string;
    password: string;
  };
}

// ===================
// VALIDATION CONSTANTS (from SRS)
// ===================

const MAX_ROWS = 1000;
const REQUIRED_COLUMNS = ["fullName", "email", "rollNumber", "phone"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;

// ===================
// MAIN PARSING FUNCTION
// ===================

/**
 * Parse and validate a CSV file for bulk student upload
 *
 * @param filePath - Path to the uploaded CSV file
 * @returns Promise<CSVUploadResult>
 */
export async function parseStudentCSV(
  filePath: string,
): Promise<CSVUploadResult> {
  const result: CSVUploadResult = {
    success: false,
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    createdCount: 0,
    errors: [],
    credentials: [],
  };

  try {
    // Read and parse CSV
    const rows = await parseCSVFile<CSVStudentRow>(filePath);
    result.totalRows = rows.length;

    // Check max rows limit
    if (rows.length > MAX_ROWS) {
      result.errors.push({
        row: 0,
        field: "file",
        value: String(rows.length),
        message: `File exceeds maximum of ${MAX_ROWS} rows`,
      });
      return result;
    }

    // Validate all rows first (collect all errors)
    const validatedRows: Array<CSVStudentRow & { rowNum: number }> = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 because row 1 is header, and we're 0-indexed
      const row = rows[i];
      const rowErrors = await validateStudentRow(row, rowNum);

      if (rowErrors.length > 0) {
        result.errors.push(...rowErrors);
        result.invalidRows++;
      } else {
        validatedRows.push({ ...row, rowNum });
        result.validRows++;
      }
    }

    // If there are any invalid rows, don't proceed with insert
    if (result.invalidRows > 0) {
      logger.warn({
        message: "CSV validation failed",
        totalRows: result.totalRows,
        invalidRows: result.invalidRows,
      });
      return result;
    }

    // Check for duplicates within the file
    const duplicateErrors = checkForDuplicates(validatedRows);
    if (duplicateErrors.length > 0) {
      result.errors.push(...duplicateErrors);
      return result;
    }

    // Check for existing emails/rollNumbers in database
    const existingErrors = await checkExistingUsers(validatedRows);
    if (existingErrors.length > 0) {
      result.errors.push(...existingErrors);
      return result;
    }

    // All validation passed - create users
    const usersToCreate = await prepareUsersForCreation(validatedRows);

    // Bulk insert using transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const user of usersToCreate) {
        await tx.user.create({ data: user.data });
        result.credentials.push(user.credentials);
        result.createdCount++;
      }
    });

    result.success = true;
    logger.info({
      message: "CSV bulk upload successful",
      createdCount: result.createdCount,
    });
  } catch (error) {
    logger.error("CSV parsing error:", error);
    result.errors.push({
      row: 0,
      field: "file",
      value: "N/A",
      message:
        "Failed to parse CSV file. Please ensure it is a valid CSV format.",
    });
  }

  return result;
}

// ===================
// PARSING HELPERS
// ===================

/**
 * Parse a CSV file into an array of objects
 */
function parseCSVFile<T>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = [];

    fs.createReadStream(filePath)
      .pipe(
        parse({
          columns: true, // Use first row as headers
          skip_empty_lines: true,
          trim: true,
          bom: true, // Handle BOM markers
        }),
      )
      .on("data", (row: T) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

// ===================
// VALIDATION HELPERS
// ===================

/**
 * Validate a single row from the CSV
 */
async function validateStudentRow(
  row: CSVStudentRow,
  rowNum: number,
): Promise<CSVValidationError[]> {
  const errors: CSVValidationError[] = [];

  // Check required fields
  for (const col of REQUIRED_COLUMNS) {
    const value = row[col as keyof CSVStudentRow];
    if (!value || String(value).trim() === "") {
      errors.push({
        row: rowNum,
        field: col,
        value: value || "",
        message: `${col} is required`,
      });
    }
  }

  // Validate email format
  if (row.email && !EMAIL_REGEX.test(row.email)) {
    errors.push({
      row: rowNum,
      field: "email",
      value: row.email,
      message: "Invalid email format",
    });
  }

  // Validate phone format (10 digits)
  if (row.phone && !PHONE_REGEX.test(row.phone.replace(/\D/g, ""))) {
    errors.push({
      row: rowNum,
      field: "phone",
      value: row.phone,
      message: "Phone must be 10 digits",
    });
  }

  // Validate fullName length
  if (row.fullName && (row.fullName.length < 2 || row.fullName.length > 100)) {
    errors.push({
      row: rowNum,
      field: "fullName",
      value: row.fullName,
      message: "Name must be 2-100 characters",
    });
  }

  // Validate groupId if provided
  if (row.groupId) {
    const group = await prisma.group.findUnique({ where: { id: row.groupId } });
    if (!group) {
      errors.push({
        row: rowNum,
        field: "groupId",
        value: row.groupId,
        message: "Group not found",
      });
    }
  }

  return errors;
}

/**
 * Check for duplicate emails/rollNumbers within the file
 */
function checkForDuplicates(
  rows: Array<CSVStudentRow & { rowNum: number }>,
): CSVValidationError[] {
  const errors: CSVValidationError[] = [];
  const emails = new Map<string, number>();
  const rollNumbers = new Map<string, number>();

  for (const row of rows) {
    // Check email duplicates
    const emailLower = row.email.toLowerCase();
    if (emails.has(emailLower)) {
      errors.push({
        row: row.rowNum,
        field: "email",
        value: row.email,
        message: `Duplicate email (also on row ${emails.get(emailLower)})`,
      });
    } else {
      emails.set(emailLower, row.rowNum);
    }

    // Check rollNumber duplicates
    if (rollNumbers.has(row.rollNumber)) {
      errors.push({
        row: row.rowNum,
        field: "rollNumber",
        value: row.rollNumber,
        message: `Duplicate roll number (also on row ${rollNumbers.get(row.rollNumber)})`,
      });
    } else {
      rollNumbers.set(row.rollNumber, row.rowNum);
    }
  }

  return errors;
}

/**
 * Check if any emails/rollNumbers already exist in the database
 */
async function checkExistingUsers(
  rows: Array<CSVStudentRow & { rowNum: number }>,
): Promise<CSVValidationError[]> {
  const errors: CSVValidationError[] = [];

  const emails = rows.map((r) => r.email.toLowerCase());
  const rollNumbers = rows.map((r) => r.rollNumber);

  // Check existing emails
  const existingEmails = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });

  const existingEmailSet = new Set(
    existingEmails.map((u) => u.email.toLowerCase()),
  );

  for (const row of rows) {
    if (existingEmailSet.has(row.email.toLowerCase())) {
      errors.push({
        row: row.rowNum,
        field: "email",
        value: row.email,
        message: "Email already exists in the system",
      });
    }
  }

  // Check existing roll numbers
  const existingRolls = await prisma.user.findMany({
    where: { rollNumber: { in: rollNumbers } },
    select: { rollNumber: true },
  });

  const existingRollSet = new Set(existingRolls.map((u) => u.rollNumber));

  for (const row of rows) {
    if (existingRollSet.has(row.rollNumber)) {
      errors.push({
        row: row.rowNum,
        field: "rollNumber",
        value: row.rollNumber,
        message: "Roll number already exists in the system",
      });
    }
  }

  return errors;
}

// ===================
// USER CREATION
// ===================

/**
 * Prepare user data for bulk creation
 */
async function prepareUsersForCreation(
  rows: Array<CSVStudentRow & { rowNum: number }>,
): Promise<PreparedUser[]> {
  const users: PreparedUser[] = [];

  for (const row of rows) {
    // Generate unique username from email
    const username = generateUsername(row.email);

    // Generate secure password
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    users.push({
      data: {
        username,
        email: row.email.toLowerCase(),
        passwordHash: hashedPassword,
        fullName: row.fullName,
        phone: row.phone.replace(/\D/g, ""),
        rollNumber: row.rollNumber,
        role: "student" as const,
        dob: row.dob ? new Date(row.dob) : null,
        department: row.department || null,
        yearOfStudy: row.yearOfStudy || null,
        collegeName: row.collegeName || null,
        isActive: true,
      },
      credentials: {
        fullName: row.fullName,
        email: row.email,
        rollNumber: row.rollNumber,
        username,
        password: plainPassword,
      },
    });
  }

  return users;
}

// ===================
// TEMPLATE GENERATION
// ===================

/**
 * Generate a CSV template for bulk upload
 */
export function generateCSVTemplate(): Promise<string> {
  return new Promise((resolve, reject) => {
    const columns = ["fullName", "email", "rollNumber", "phone", "groupId", "dob", "department", "yearOfStudy", "collegeName"];
    const sampleData = [
      ["John Doe", "john.doe@example.com", "STU001", "9876543210", "", "2000-01-01", "Computer Science", "3rd Year", "Example College"],
      ["Jane Smith", "jane.smith@example.com", "STU002", "9876543211", "", "2001-05-15", "Electrical Engineering", "2nd Year", "Example College"],
    ];

    stringify([columns, ...sampleData], (err, output) => {
      if (err) reject(err);
      else resolve(output);
    });
  });
}

/**
 * Export credentials to CSV (for download after bulk upload)
 */
export function exportCredentialsCSV(
  credentials: Array<{
    fullName: string;
    email: string;
    rollNumber: string;
    username: string;
    password: string;
  }>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const columns = ["fullName", "email", "rollNumber", "username", "password"];
    const rows = credentials.map((c) => [
      c.fullName,
      c.email,
      c.rollNumber,
      c.username,
      c.password,
    ]);

    stringify([columns, ...rows], (err, output) => {
      if (err) reject(err);
      else resolve(output);
    });
  });
}



const REQUIRED_FACULTY_COLUMNS = ['fullName', 'email', 'phone'];

export async function parseFacultyCSV(filePath: string): Promise<CSVUploadResult> {
  const result: CSVUploadResult = {
    success: false, totalRows: 0, validRows: 0, invalidRows: 0, createdCount: 0, errors: [], credentials: [],
  };
  try {
    const rows = await parseCSVFile<CSVFacultyRow>(filePath);
    result.totalRows = rows.length;
    if (rows.length > MAX_ROWS) {
      result.errors.push({ row: 0, field: 'file', value: String(rows.length), message: `File exceeds maximum of ${MAX_ROWS} rows` });
      return result;
    }
    const validatedRows: Array<CSVFacultyRow & { rowNum: number }> = [];
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const row = rows[i];
      const rowErrors = await validateFacultyRow(row, rowNum);
      if (rowErrors.length > 0) {
        result.errors.push(...rowErrors);
        result.invalidRows++;
      } else {
        validatedRows.push({ ...row, rowNum });
        result.validRows++;
      }
    }
    if (result.invalidRows > 0) return result;
    
    // check dups
    const dupErrors = checkForFacultyDuplicates(validatedRows);
    if (dupErrors.length > 0) { result.errors.push(...dupErrors); return result; }
    
    const existingErrors = await checkExistingFacultyEmails(validatedRows);
    if (existingErrors.length > 0) { result.errors.push(...existingErrors); return result; }
    
    const usersToCreate = await prepareFacultyForCreation(validatedRows);
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const user of usersToCreate) {
        await tx.user.create({ data: user.data });
        result.credentials.push(user.credentials);
        result.createdCount++;
      }
    });
    result.success = true;
  } catch (error) {
    result.errors.push({ row: 0, field: 'file', value: 'N/A', message: 'Failed to parse CSV file.' });
  }
  return result;
}

async function validateFacultyRow(row: CSVFacultyRow, rowNum: number): Promise<CSVValidationError[]> {
  const errors: CSVValidationError[] = [];
  for (const col of REQUIRED_FACULTY_COLUMNS) {
    const value = row[col as keyof CSVFacultyRow];
    if (!value || String(value).trim() === '') {
      errors.push({ row: rowNum, field: col, value: value || '', message: `${col} is required` });
    }
  }
  if (row.email && !EMAIL_REGEX.test(row.email)) errors.push({ row: rowNum, field: 'email', value: row.email, message: 'Invalid email format' });
  if (row.phone && !PHONE_REGEX.test(row.phone.replace(/\D/g, ''))) errors.push({ row: rowNum, field: 'phone', value: row.phone, message: 'Phone must be 10 digits' });
  if (row.fullName && (row.fullName.length < 2 || row.fullName.length > 100)) errors.push({ row: rowNum, field: 'fullName', value: row.fullName, message: 'Name must be 2-100 characters' });
  return errors;
}

function checkForFacultyDuplicates(rows: Array<CSVFacultyRow & { rowNum: number }>): CSVValidationError[] {
  const errors: CSVValidationError[] = [];
  const emails = new Map<string, number>();
  for (const row of rows) {
    const emailLower = row.email.toLowerCase();
    if (emails.has(emailLower)) errors.push({ row: row.rowNum, field: 'email', value: row.email, message: `Duplicate email (also on row ${emails.get(emailLower)})` });
    else emails.set(emailLower, row.rowNum);
  }
  return errors;
}

async function checkExistingFacultyEmails(rows: Array<CSVFacultyRow & { rowNum: number }>): Promise<CSVValidationError[]> {
  const errors: CSVValidationError[] = [];
  const emails = rows.map((r) => r.email.toLowerCase());
  const existingEmails = await prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } });
  const existingEmailSet = new Set(existingEmails.map((u) => u.email.toLowerCase()));
  for (const row of rows) {
    if (existingEmailSet.has(row.email.toLowerCase())) {
      errors.push({ row: row.rowNum, field: 'email', value: row.email, message: 'Email already exists' });
    }
  }
  return errors;
}

async function prepareFacultyForCreation(rows: Array<CSVFacultyRow & { rowNum: number }>): Promise<PreparedUser[]> {
  const users: PreparedUser[] = [];
  for (const row of rows) {
    const username = generateUsername(row.email);
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    users.push({
      data: {
        username, email: row.email.toLowerCase(), passwordHash: hashedPassword, fullName: row.fullName, phone: row.phone.replace(/\D/g, ''),
        role: 'faculty', isActive: true, rollNumber: null
      },
      credentials: { fullName: row.fullName, email: row.email, rollNumber: 'N/A', username, password: plainPassword }
    });
  }
  return users;
}

export function generateFacultyCSVTemplate(): Promise<string> {
  return new Promise((resolve, reject) => {
    const columns = ['fullName', 'email', 'phone'];
    const sampleData = [
      ['Faculty One', 'faculty.one@example.com', '9876543210'],
      ['Faculty Two', 'faculty.two@example.com', '9876543211'],
    ];
    stringify([columns, ...sampleData], (err, output) => {
      if (err) reject(err); else resolve(output);
    });
  });
}

/**
 * Export a list of user objects to a CSV string
 */
export function exportUsersToCSV(users: any[], role: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let columns: string[] = [];
    let rows: any[][] = [];

    if (role === "student") {
      columns = ["fullName", "email", "rollNumber", "phone", "department", "yearOfStudy", "collegeName", "isActive"];
      rows = users.map(u => [
        u.fullName,
        u.email,
        u.rollNumber || "",
        u.phone || "",
        u.department || "",
        u.yearOfStudy || "",
        u.collegeName || "",
        u.isActive ? "Yes" : "No"
      ]);
    } else {
      columns = ["fullName", "email", "phone", "isActive"];
      rows = users.map(u => [
        u.fullName,
        u.email,
        u.phone || "",
        u.isActive ? "Yes" : "No"
      ]);
    }

    stringify([columns, ...rows], (err, output) => {
      if (err) reject(err);
      else resolve(output);
    });
  });
}
