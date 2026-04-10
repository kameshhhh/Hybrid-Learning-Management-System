import fs from 'fs';

const files = [
  'src/controllers/adminSessionController.ts',
  'src/services/authService.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix TS types for query parameters in adminSessionController
  if (file.includes('adminSessionController.ts')) {
    content = content.replace(/req\.query\.role/g, '(req.query.role as string)');
    content = content.replace(/req\.query\.status/g, '(req.query.status as string)');
    content = content.replace(/req\.query\.search/g, '(req.query.search as string)');
    content = content.replace(/req\.query\.userId/g, '(req.query.userId as string)');
    content = content.replace(/req\.query\.action/g, '(req.query.action as string)');
    content = content.replace(/req\.query\.entityType/g, '(req.query.entityType as string)');
    
    // Some query params are already casted as `as string` or `===`, but we are doing a dumb replace so:
    content = content.replace(/\(req\.query\.role as string\) as string/g, '(req.query.role as string)');
    content = content.replace(/\(req\.query\.status as string\) as string/g, '(req.query.status as string)');
  }

  // Fix entity_type in authService
  if (file.includes('authService.ts')) {
    content = content.replace(/entity_type:/g, 'entityType:');
  }

  fs.writeFileSync(file, content);
}
console.log('Fixed TS casting and entityType!');
