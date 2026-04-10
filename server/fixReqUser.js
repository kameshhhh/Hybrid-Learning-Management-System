import fs from 'fs';

const files = [
  'src/controllers/adminSessionController.ts',
  'src/controllers/authController.ts',
  'src/middleware/authMiddleware.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/req\.user\?\.id/g, 'req.user?.userId');
  content = content.replace(/req\.user\.id/g, 'req.user.userId');
  
  if (file.includes('authMiddleware.ts')) {
    // We remove the declare global from authMiddleware so it doesn't conflict with auth.ts
    content = content.replace(/declare global \{[\s\S]*?\}\s*\}/, '');
    // Fix the mapping: req.user = { userId: user.id ... }
    content = content.replace('id: user.id,', 'userId: user.id,');
  }

  // Also in adminSessionController, there's `req.userId` maybe? No, just `req.user.id` -> `req.user.userId`.
  fs.writeFileSync(file, content);
}
console.log('Fixed req.user.id -> req.user.userId and removed duplicate declaration!');
