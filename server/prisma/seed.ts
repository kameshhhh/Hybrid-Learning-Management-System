import { PrismaClient, UserRole, SkillStatus, GroupType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // ============================================
  // 1. CREATE ADMIN USER
  // ============================================
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hlms.com' },
    update: {},
    create: {
      username: 'superadmin',
      email: 'admin@hlms.com',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      role: UserRole.admin,
      isActive: true,
      createdAt: new Date(),
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // ============================================
  // 2. CREATE FACULTY USERS
  // ============================================
  const facultyPassword = await bcrypt.hash('Faculty@123', 10);
  
  const faculty1 = await prisma.user.upsert({
    where: { email: 'dr.smith@skillcourse.com' },
    update: {},
    create: {
      username: 'drsmith',
      email: 'dr.smith@skillcourse.com',
      passwordHash: facultyPassword,
      fullName: 'Dr. John Smith',
      phone: '+1234567890',
      role: UserRole.faculty,
      isActive: true,
      createdBy: admin.id,
    },
  });
  
  const faculty2 = await prisma.user.upsert({
    where: { email: 'prof.johnson@skillcourse.com' },
    update: {},
    create: {
      username: 'profjohnson',
      email: 'prof.johnson@skillcourse.com',
      passwordHash: facultyPassword,
      fullName: 'Prof. Sarah Johnson',
      phone: '+1234567891',
      role: UserRole.faculty,
      isActive: true,
      createdBy: admin.id,
    },
  });
  
  console.log(`✅ Faculty created: ${faculty1.email}, ${faculty2.email}`);

  // ============================================
  // 3. CREATE SAMPLE SKILL
  // ============================================
  const pythonSkill = await prisma.skill.upsert({
    where: { skillCode: 'SK-PYTHON-001' },
    update: {},
    create: {
      skillCode: 'SK-PYTHON-001',
      name: 'Python Programming Lab',
      description: 'A comprehensive hands-on course covering Python fundamentals to advanced concepts including data structures, file handling, and object-oriented programming. Students will build real-world projects and gain practical coding skills.',
      durationWeeks: 8,
      status: SkillStatus.approved,
      createdBy: admin.id,
      approvedBy: admin.id,
      approvedAt: new Date(),
      thumbnailUrl: 'https://example.com/thumbnails/python.jpg',
    },
  });
  console.log(`✅ Skill created: ${pythonSkill.name}`);

  // ============================================
  // 4. ASSIGN FACULTY TO SKILL
  // ============================================
  await prisma.skillFaculty.upsert({
    where: {
      skillId_facultyId: {
        skillId: pythonSkill.id,
        facultyId: faculty1.id,
      },
    },
    update: {},
    create: {
      skillId: pythonSkill.id,
      facultyId: faculty1.id,
      assignedBy: admin.id,
      isPrimary: true,
    },
  });
  
  await prisma.skillFaculty.upsert({
    where: {
      skillId_facultyId: {
        skillId: pythonSkill.id,
        facultyId: faculty2.id,
      },
    },
    update: {},
    create: {
      skillId: pythonSkill.id,
      facultyId: faculty2.id,
      assignedBy: admin.id,
      isPrimary: false,
    },
  });
  console.log(`✅ Faculty assigned to skill`);

  // ============================================
  // 5. CREATE CHAPTERS
  // ============================================
  const chapter1 = await prisma.skillChapter.create({
    data: {
      skillId: pythonSkill.id,
      title: 'Python Basics',
      description: 'Introduction to Python programming language, setup, and basic syntax',
      orderIndex: 1,
      createdBy: faculty1.id,
      status: 'approved',
    },
  });
  
  const chapter2 = await prisma.skillChapter.create({
    data: {
      skillId: pythonSkill.id,
      title: 'Control Flow',
      description: 'Conditional statements and loops in Python',
      orderIndex: 2,
      createdBy: faculty1.id,
      status: 'approved',
    },
  });
  
  const chapter3 = await prisma.skillChapter.create({
    data: {
      skillId: pythonSkill.id,
      title: 'Functions and Modules',
      description: 'Creating reusable code with functions and organizing code with modules',
      orderIndex: 3,
      createdBy: faculty1.id,
      status: 'approved',
    },
  });
  console.log(`✅ Chapters created: ${chapter1.title}, ${chapter2.title}, ${chapter3.title}`);

  // ============================================
  // 6. CREATE LESSONS
  // ============================================
  const lesson1 = await prisma.skillLesson.create({
    data: {
      chapterId: chapter1.id,
      title: 'Introduction to Python',
      description: 'What is Python? Why Python? Setting up the environment',
      orderIndex: 1,
      videoUrl: 'https://example.com/videos/python_intro.mp4',
      videoDuration: 900, // 15 minutes
      videoFormat: 'mp4',
      videoResolution: '1080p',
      status: 'approved',
      createdBy: faculty1.id,
    },
  });
  
  const lesson2 = await prisma.skillLesson.create({
    data: {
      chapterId: chapter1.id,
      title: 'Variables and Data Types',
      description: 'Understanding variables, numbers, strings, and booleans',
      orderIndex: 2,
      videoUrl: 'https://example.com/videos/python_variables.mp4',
      videoDuration: 1200, // 20 minutes
      videoFormat: 'mp4',
      videoResolution: '1080p',
      status: 'approved',
      createdBy: faculty1.id,
    },
  });
  
  const lesson3 = await prisma.skillLesson.create({
    data: {
      chapterId: chapter2.id,
      title: 'If-Else Statements',
      description: 'Conditional execution in Python',
      orderIndex: 1,
      videoUrl: 'https://example.com/videos/python_if_else.mp4',
      videoDuration: 900,
      videoFormat: 'mp4',
      videoResolution: '1080p',
      status: 'approved',
      createdBy: faculty1.id,
    },
  });
  console.log(`✅ Lessons created: ${lesson1.title}, ${lesson2.title}, ${lesson3.title}`);

  // ============================================
  // 7. CREATE TASKS WITH RUBRICS
  // ============================================
  const task1 = await prisma.skillTask.create({
    data: {
      skillId: pythonSkill.id,
      dayNumber: 1,
      title: 'Hello World Program',
      description: 'Write your first Python program to print "Hello, World!"',
      maxMarks: 10,
      passingMarks: 5,
      rubric: [
        { criterion: "Code Correctness", weight: 4, maxScore: 4 },
        { criterion: "Code Formatting", weight: 2, maxScore: 2 },
        { criterion: "Comments", weight: 2, maxScore: 2 },
        { criterion: "Output Matching", weight: 2, maxScore: 2 },
      ],
      submissionType: 'file',
      allowedFileTypes: ['py'],
      maxFileSize: 10485760,
      deadlineDays: 1,
      status: 'approved',
      createdBy: faculty1.id,
    },
  });
  
  const task2 = await prisma.skillTask.create({
    data: {
      skillId: pythonSkill.id,
      dayNumber: 2,
      title: 'Variables and Calculations',
      description: 'Create variables and perform basic arithmetic operations',
      maxMarks: 10,
      passingMarks: 5,
      rubric: [
        { criterion: "Variable Declaration", weight: 2, maxScore: 2 },
        { criterion: "Arithmetic Operations", weight: 3, maxScore: 3 },
        { criterion: "Output Format", weight: 2, maxScore: 2 },
        { criterion: "Code Readability", weight: 2, maxScore: 2 },
        { criterion: "Error Handling", weight: 1, maxScore: 1 },
      ],
      submissionType: 'both',
      allowedFileTypes: ['py', 'txt'],
      maxFileSize: 10485760,
      deadlineDays: 1,
      status: 'approved',
      createdBy: faculty1.id,
    },
  });
  console.log(`✅ Tasks created: ${task1.title}, ${task2.title}`);

  // ============================================
  // 8. CREATE GROUPS
  // ============================================
  const group1 = await prisma.group.upsert({
    where: { groupCode: 'BATCH-CS-A-2024' },
    update: {},
    create: {
      groupCode: 'BATCH-CS-A-2024',
      name: 'CS Batch A 2024',
      type: GroupType.batch,
      description: 'Computer Science Batch A - Year 2024',
      createdBy: admin.id,
    },
  });
  
  const group2 = await prisma.group.upsert({
    where: { groupCode: 'TEAM-ALPHA' },
    update: {},
    create: {
      groupCode: 'TEAM-ALPHA',
      name: 'Team Alpha',
      type: GroupType.team,
      description: 'Project Team Alpha',
      createdBy: admin.id,
    },
  });
  console.log(`✅ Groups created: ${group1.name}, ${group2.name}`);

  // ============================================
  // 9. CREATE SAMPLE STUDENTS
  // ============================================
  const studentPassword = await bcrypt.hash('Student@123', 10);
  
  const student1 = await prisma.user.upsert({
    where: { email: 'john.doe@student.com' },
    update: {},
    create: {
      username: 'johndoe',
      email: 'john.doe@student.com',
      passwordHash: studentPassword,
      fullName: 'John Doe',
      phone: '+1234567892',
      role: UserRole.student,
      isActive: true,
      createdBy: admin.id,
    },
  });
  
  const student2 = await prisma.user.upsert({
    where: { email: 'jane.smith@student.com' },
    update: {},
    create: {
      username: 'janesmith',
      email: 'jane.smith@student.com',
      passwordHash: studentPassword,
      fullName: 'Jane Smith',
      phone: '+1234567893',
      role: UserRole.student,
      isActive: true,
      createdBy: admin.id,
    },
  });
  console.log(`✅ Students created: ${student1.full_name}, ${student2.full_name}`);

  // ============================================
  // 10. ADD STUDENTS TO GROUPS
  // ============================================
  await prisma.groupMember.createMany({
    data: [
      { groupId: group1.id, studentId: student1.id },
      { groupId: group1.id, studentId: student2.id },
      { groupId: group2.id, studentId: student1.id },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Students added to groups`);

  // ============================================
  // 11. ASSIGN SKILL TO GROUP (Bulk Assignment)
  // ============================================
  await prisma.skillGroupAssignment.upsert({
    where: {
      skillId_groupId: {
        skillId: pythonSkill.id,
        groupId: group1.id,
      },
    },
    update: {},
    create: {
      skillId: pythonSkill.id,
      groupId: group1.id,
      assignedBy: admin.id,
    },
  });
  console.log(`✅ Skill assigned to group`);

  // ============================================
  // 12. ASSIGN SKILL TO INDIVIDUAL STUDENTS
  // ============================================
  await prisma.studentSkill.createMany({
    data: [
      {
        studentId: student1.id,
        skillId: pythonSkill.id,
        assignedBy: admin.id,
        groupId: group1.id,
        status: 'active',
      },
      {
        studentId: student2.id,
        skillId: pythonSkill.id,
        assignedBy: admin.id,
        groupId: group1.id,
        status: 'active',
      },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Skill assigned to students`);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('📊 Summary:');
  console.log(`   - Users: Admin(1), Faculty(2), Students(2)`);
  console.log(`   - Skills: 1`);
  console.log(`   - Chapters: 3`);
  console.log(`   - Lessons: 3`);
  console.log(`   - Tasks: 2`);
  console.log(`   - Groups: 2`);
  console.log('\n🔐 Default Passwords:');
  console.log(`   - Admin: Admin@123`);
  console.log(`   - Faculty: Faculty@123`);
  console.log(`   - Student: Student@123`);
}

main()
  .catch((e) => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
})
  .finally(async () => {
  await prisma.$disconnect();
});
