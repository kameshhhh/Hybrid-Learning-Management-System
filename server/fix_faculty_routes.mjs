import * as fs from 'fs';

let content = fs.readFileSync('src/routes/faculty.routes.ts', 'utf8');

// Update function signature
content = content.replace(
  /async function verifyFacultyOwnsSkill\(\s*facultyId: string,\s*skillId: string,?\s*\): Promise<void> \{/,
  `async function verifyFacultyOwnsSkill(
  user: { userId: string; role: string },
  skillId: string,
): Promise<void> {
  if (user.role === 'admin') return;
  const facultyId = user.userId;`
);

// Update all calls
content = content.replace(/verifyFacultyOwnsSkill\(req\.user!\.userId,\s*/g, 'verifyFacultyOwnsSkill(req.user!, ');

fs.writeFileSync('src/routes/faculty.routes.ts', content);
console.log('Done mapping verifyFacultyOwnsSkill args.');
