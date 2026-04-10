# 🧪 Complete Testing Guide - HLMS

## Test Execution Status

This guide provides step-by-step instructions to test every feature of the HLMS system.

---

## 🔐 Authentication Tests

### Test 1.1: Admin Login

```
✅ Steps:
1. Open http://localhost:3002
2. Enter credentials:
   - Email: admin@hlms.com
   - Password: Admin@123
3. Click Login

Expected Result:
- Successful login
- Redirect to admin dashboard
- See welcome message with admin name
```

### Test 1.2: Single Device Login

```
✅ Steps:
1. Login as student1@hlms.com in Browser 1
2. Open Browser 2 (incognito)
3. Login as same student1@hlms.com in Browser 2

Expected Result:
- Browser 2 login succeeds
- Browser 1 gets automatic logout notification
- Browser 1 redirected to login page
```

### Test 1.3: Failed Login Lockout

```
✅ Steps:
1. Try logging in with wrong password 5 times
2. Try logging in with correct password

Expected Result:
- After 5 failed attempts, account locked for 15 minutes
- Error message: "Account is locked. Try again in X minutes"
```

---

## 👨‍💼 Admin Module Tests

### Test 2.1: View Dashboard

```
✅ Steps:
1. Login as admin
2. View dashboard statistics

Expected Result:
- See total skills count
- See active students count
- See total faculty count
- See completed skills count
- See recent activities
- See pending approvals
```

### Test 2.2: Create New Skill

```
✅ Steps:
1. Navigate to Skills Management
2. Click "Create New Skill"
3. Fill form:
   - Skill Code: SK-TEST-001
   - Skill Name: Test Skill Creation
   - Description: (at least 50 characters)
   - Duration: 4 weeks
   - Assign Faculty: Select faculty1
   - Status: draft
4. Click Submit

Expected Result:
- Success message displayed
- Skill appears in skills list
- Faculty assigned successfully
```

### Test 2.3: Create Student (Single)

```
✅ Steps:
1. Navigate to Students > Add Student
2. Fill form:
   - Full Name: Test Student
   - Email: teststudent@test.com
   - Username: teststudent
   - Password: Student@Test123
   - Roll Number: TEST001
3. Click Create

Expected Result:
- Student created successfully
- Welcome email sent (check logs)
- Student appears in students list
```

### Test 2.4: Bulk Student Upload

```
✅ Steps:
1. Navigate to Students > Bulk Upload
2. Download CSV template
3. Fill template with test data (5 students)
4. Upload CSV file
5. Review validation results
6. Confirm upload

Expected Result:
- All valid rows processed
- Invalid rows shown with error messages
- Credentials exported to CSV
- Students visible in list
```

### Test 2.5: Assign Skill to Student

```
✅ Steps:
1. Navigate to Skills Management
2. Select a skill
3. Click "Assign Students"
4. Select students
5. Click Assign

Expected Result:
- Students enrolled in skill
- Notification sent to students
- Enrollment visible in student dashboard
```

### Test 2.6: Force Logout Student

```
✅ Steps:
1. Ensure student is logged in (check sessions)
2. Navigate to Students
3. Find the student
4. Click "Force Logout"
5. Enter reason
6. Confirm

Expected Result:
- Student session invalidated
- Real-time logout notification sent
- Student sees logout message
- Student can login again immediately
```

### Test 2.7: Export Reports

```
✅ Steps:
1. Navigate to Reports
2. Select "Skill Completion Report"
3. Apply filters (date range, skill)
4. Click Export as CSV
5. Repeat for Excel and PDF

Expected Result:
- CSV file downloads successfully
- Excel file downloads with proper formatting
- PDF file downloads with logo and styling
- Data matches filtered criteria
```

---

## 👨‍🏫 Faculty Module Tests

### Test 3.1: View Assigned Skills

```
✅ Steps:
1. Login as faculty1@hlms.com
2. View dashboard

Expected Result:
- See all assigned skills
- See pending assessments count
- See student progress statistics
- Can only access assigned skills
```

### Test 3.2: Create Chapter

```
✅ Steps:
1. Select assigned skill
2. Navigate to Content > Add Chapter
3. Fill form:
   - Title: Advanced Topics
   - Description: Advanced concepts
   - Chapter Number: (auto)
4. Submit

Expected Result:
- Chapter created successfully
- Appears in chapter list
- Chapter number auto-incremented
```

### Test 3.3: Upload Video Lesson

```
✅ Steps:
1. Select a chapter
2. Click "Add Lesson"
3. Fill form:
   - Title: Introduction to React
   - Description: Learn React basics
   - Upload video (MP4, < 500MB)
4. Wait for video validation
5. Submit

Expected Result:
- Video uploads successfully
- Validation checks pass:
  * Format: MP4 ✅
  * Size: < 500MB ✅
  * Duration: < 30 min ✅
  * Resolution: 720p+ ✅
- Lesson created
- Video thumbnail generated
```

### Test 3.4: Create Task with Rubric

```
✅ Steps:
1. Select skill
2. Navigate to Tasks > Create Task
3. Fill form:
   - Title: Build React Component
   - Description: Create a functional component
   - Max Marks: 10
   - Rubric Criteria:
     * Code Quality: 4 points
     * Functionality: 3 points
     * Documentation: 2 points
     * Code Style: 1 point
4. Verify total = 10
5. Submit

Expected Result:
- Task created
- Rubric saved correctly
- Total weights = 10
- Task visible to enrolled students
```

### Test 3.5: Mark Daily Assessment

```
✅ Steps:
1. Navigate to Assessments > Pending
2. Select a submission
3. View student work
4. Score each rubric criterion:
   - Code Quality: 3.5/4
   - Functionality: 2.5/3
   - Documentation: 1.5/2
   - Code Style: 0.5/1
5. Add feedback
6. Submit assessment

Expected Result:
- Total calculated: 8.0/10
- Marks saved
- Feedback sent to student
- Student notified
- Progress updated
```

### Test 3.6: View Student Progress

```
✅ Steps:
1. Navigate to Students
2. Select a student
3. View detailed progress

Expected Result:
- See all enrolled skills
- See chapter-wise progress
- See task completion status
- See marks obtained
- See overall percentage
```

---

## 👨‍🎓 Student Module Tests

### Test 4.1: View Enrolled Skills

```
✅ Steps:
1. Login as student1@hlms.com
2. View dashboard

Expected Result:
- See all assigned skills
- See progress percentage for each
- See current task/chapter
- See next deadline
- See completed skills with certificate option
```

### Test 4.2: Watch Video Lesson

```
✅ Steps:
1. Select a skill
2. Navigate to a chapter
3. Click on a lesson
4. Play video
5. Watch for 2 minutes
6. Pause and navigate away
7. Return to same lesson

Expected Result:
- Video plays smoothly
- Progress bar updates
- Progress saved (resume from 2 min mark)
- Completion percentage updates
- Mark as complete option appears at 90%
```

### Test 4.3: Submit Task

```
✅ Steps:
1. Navigate to Tasks
2. View today's task
3. Read rubric criteria
4. Prepare submission file
5. Upload file or enter text
6. Add comments
7. Submit

Expected Result:
- File uploads successfully
- Submission confirmed
- Faculty notified
- Status shows "Submitted"
- Can view submission history
```

### Test 4.4: View Marks & Feedback

```
✅ Steps:
1. Navigate to Tasks > Completed
2. View assessed task
3. Check marks and feedback

Expected Result:
- See total marks obtained
- See rubric breakdown
- See faculty feedback
- See assessment date
- Can download marked file (if any)
```

### Test 4.5: Track Overall Progress

```
✅ Steps:
1. Navigate to Progress tab
2. View skill progress

Expected Result:
- See chapter completion percentage
- See lesson completion status
- See task marks
- See total percentage
- See certificate option (if 100%)
```

### Test 4.6: Download Certificate

```
✅ Steps:
1. Complete all tasks (mark as done from faculty panel)
2. Login as student
3. Navigate to completed skill
4. Click "Download Certificate"

Expected Result:
- PDF certificate downloads
- Contains:
  * Student name
  * Skill name
  * Certificate number
  * Issue date
  * QR code
  * Signature
- Can verify certificate with QR code
```

---

## 🔄 Real-time Features Tests

### Test 5.1: Live Notifications

```
✅ Steps:
1. Login as student in Browser 1
2. Login as faculty in Browser 2
3. Faculty marks student's task
4. Check student's browser

Expected Result:
- Student receives instant notification
- Notification shows: "Task X has been assessed"
- Notification appears without page refresh
- Click notification to view marks
```

### Test 5.2: Force Logout Real-time

```
✅ Steps:
1. Login as student
2. Admin force logs out the student
3. Observe student screen

Expected Result:
- Immediate logout modal appears
- Shows reason for logout
- Auto-redirect to login in 5 seconds
- Session invalidated
```

### Test 5.3: Progress Updates

```
✅ Steps:
1. Login as student
2. Complete a lesson
3. Admin/Faculty viewing progress dashboard

Expected Result:
- Progress updates in real-time
- No page refresh needed
- Chart updates automatically
- Completion status changes
```

---

## 📊 Data Export Tests

### Test 6.1: CSV Export

```
✅ Steps:
1. Navigate to Reports > Students
2. Apply filters
3. Click "Export CSV"

Expected Result:
- CSV file downloads
- Contains correct columns
- Data matches filters
- Special characters handled
- Unicode characters preserved
```

### Test 6.2: Excel Export

```
✅ Steps:
1. Generate any report
2. Click "Export Excel"

Expected Result:
- .xlsx file downloads
- Multiple sheets (if applicable)
- Formatted headers
- Proper data types
- Formulas work
```

### Test 6.3: PDF Export

```
✅ Steps:
1. Generate completion report
2. Click "Export PDF"

Expected Result:
- PDF file downloads
- Professional formatting
- Logo included
- Page numbers
- Proper margins
- Charts/graphs rendered
```

---

## 🛡️ Security Tests

### Test 7.1: Role-Based Access

```
✅ Steps:
1. Login as student
2. Try to access admin API endpoints directly
3. Try to access faculty routes

Expected Result:
- All unauthorized requests blocked
- 403 Forbidden error returned
- No data leaked
```

### Test 7.2: SQL Injection Protection

```
✅ Steps:
1. Try login with: admin'--
2. Try search with: ' OR '1'='1
3. Try username: admin'; DROP TABLE users;--

Expected Result:
- All attempts fail safely
- No SQL errors exposed
- Database remains intact
```

### Test 7.3: XSS Protection

```
✅ Steps:
1. Try creating skill with name: <script>alert('XSS')</script>
2. Try comment with: <img src=x onerror=alert('XSS')>

Expected Result:
- Input sanitized
- No script execution
- Special characters escaped
```

---

## ⚡ Performance Tests

### Test 8.1: Page Load Time

```
✅ Steps:
1. Open DevTools Network tab
2. Load dashboard
3. Check load time

Expected Result:
- Initial load < 2 seconds
- Subsequent loads < 500ms
- Resources cached properly
```

### Test 8.2: API Response Time

```
✅ Steps:
1. Make API calls
2. Check response times

Expected Result:
- Simple queries < 100ms
- Complex queries < 500ms
- File uploads < 5s (for 10MB)
```

### Test 8.3: Concurrent Users

```
✅ Steps:
1. Open 10 browser tabs
2. Login different users
3. Perform various actions

Expected Result:
- All actions work smoothly
- No database locks
- Real-time updates work
- No performance degradation
```

---

## 🔧 Edge Cases & Error Handling

### Test 9.1: Network Interruption

```
✅ Steps:
1. Start video upload
2. Disable network mid-upload
3. Re-enable network

Expected Result:
- Error message shown
- Retry option available
- Partial upload handled
- No corrupted data
```

### Test 9.2: Invalid File Types

```
✅ Steps:
1. Try uploading .exe as video
2. Try uploading .pdf as image

Expected Result:
- File type validation fails
- Clear error message
- No file saved
- No security risk
```

### Test 9.3: Large File Upload

```
✅ Steps:
1. Try uploading 600MB video

Expected Result:
- Validation fails
- Error: "File too large"
- No upload attempted
- Server not stressed
```

### Test 9.4: Expired Session

```
✅ Steps:
1. Login
2. Keep idle for token expiry time
3. Try to perform action

Expected Result:
- Session expired error
- Redirect to login
- No data loss
- Can resume after re-login
```

---

## ✅ Test Summary Checklist

- [ ] All authentication tests passed
- [ ] All admin tests passed
- [ ] All faculty tests passed
- [ ] All student tests passed
- [ ] All real-time features work
- [ ] All exports work correctly
- [ ] All security measures effective
- [ ] Performance meets standards
- [ ] Edge cases handled properly
- [ ] No console errors
- [ ] No database errors
- [ ] No UI glitches

---

## 📋 Test Report Template

```markdown
## Test Execution Report

**Date**: [Date]
**Tester**: [Name]
**Build Version**: 1.0.0

### Summary

- Total Tests: 50
- Passed: XX
- Failed: XX
- Blocked: XX

### Failed Tests

1. Test ID: X.X
   - Issue: [Description]
   - Steps to reproduce: [Steps]
   - Expected: [Expected result]
   - Actual: [Actual result]
   - Severity: High/Medium/Low

### Blockers

[List any blocking issues]

### Notes

[Additional observations]
```

---

## 🚀 Automated Testing (Future)

For automated testing, consider:

- **Jest** for unit tests
- **Cypress** for E2E tests
- **Postman** for API tests
- **k6** for load tests

---

**Last Updated**: 2026-04-03  
**Version**: 1.0.0
