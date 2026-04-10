import fs from 'fs';

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. User missing rollNumber
content = content.replace(/role\s+UserRole/, 'role          UserRole\n  rollNumber    String?   @map("roll_number")');

// 2. Skill missing studentSkills alias
content = content.replace(/studentAssignments\s+StudentSkill\[\]/g, 'studentSkills StudentSkill[]');
content = content.replace(/facultyAssignments\s+SkillFaculty\[\]/g, 'faculty SkillFaculty[]');

// 3. User missing studentSkills relation alias
content = content.replace(/studentEnrollments\s+StudentSkill\[\]/g, 'studentSkills StudentSkill[]');
content = content.replace(/facultyAssignments\s+SkillFaculty\[\]/g, 'facultyAssignments SkillFaculty[]'); // keeping for now

// 4. SkillChapter: chapterNumber -> orderIndex
content = content.replace(/chapterNumber\s+Int/g, 'orderIndex Int @map("order_index")');

// 5. SkillLesson: lessonNumber -> orderIndex, add textContent, videoDurationSeconds, contentType
content = content.replace(/lessonNumber\s+Int/g, 'orderIndex Int @map("order_index")\n  contentType String @default("video") @map("content_type")\n  textContent String? @map("text_content")\n  videoDurationSeconds Int? @map("video_duration_seconds")');

// 6. SkillTask: taskNumber -> dayNumber, rubric Json?, dueDate DateTime?
content = content.replace(/taskNumber\s+Int/g, 'dayNumber Int @map("day_number")\n  rubric Json?\n  dueDate DateTime? @map("due_date")');

// 7. StudentSkill missing skill, student alias
// In StudentSkill, relation names might be wrong
// The relation to User: studentUser User @relation(...) -> student User
content = content.replace(/  student\s+User\s+@relation\("StudentEnrollment"/g, '  student     User     @relation("StudentEnrollment"');


fs.writeFileSync('prisma/schema.prisma', content);
console.log('Fixed missing fields in Prisma schema!');
