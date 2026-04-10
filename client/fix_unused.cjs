const fs = require('fs');

// 1. StudentActionsPanel.tsx
let f1 = fs.readFileSync('src/components/admin/StudentActionsPanel.tsx', 'utf8');
f1 = f1.replace(/const \[newPassword, setNewPassword\] = useState\(""\);/g, 'const [, setNewPassword] = useState("");');
fs.writeFileSync('src/components/admin/StudentActionsPanel.tsx', f1);

// 2. FacultyManagementPage.tsx
let f2 = fs.readFileSync('src/pages/admin/FacultyManagementPage.tsx', 'utf8');
f2 = f2.replace(/ Check,/g, ' ');
fs.writeFileSync('src/pages/admin/FacultyManagementPage.tsx', f2);

// 3. ReportsPage.tsx
let f3 = fs.readFileSync('src/pages/admin/ReportsPage.tsx', 'utf8');
f3 = f3.replace(/ Download, Filter,/g, ' ');
fs.writeFileSync('src/pages/admin/ReportsPage.tsx', f3);

// 4. StudentManagementPage.tsx
let f4 = fs.readFileSync('src/pages/admin/StudentManagementPage.tsx', 'utf8');
f4 = f4.replace(/const \[isFetchingDetails, setIsFetchingDetails\] = useState\(false\);/g, '');
f4 = f4.replace(/setIsFetchingDetails\(true\);/g, '');
f4 = f4.replace(/setIsFetchingDetails\(false\);/g, '');
fs.writeFileSync('src/pages/admin/StudentManagementPage.tsx', f4);

console.log('done');
