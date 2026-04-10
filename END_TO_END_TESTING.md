# 🧪 HLMS - COMPLETE END-TO-END TESTING GUIDE

**This guide walks you through the complete workflow of the HLMS system to verify everything is working correctly.**

---

## ✅ PRE-TEST CHECKLIST

Before starting, verify:

- [ ] Both servers are running (Backend on 5000, Frontend on 3000)
- [ ] Database is connected (check `/health` endpoint)
- [ ] Test data has been seeded
- [ ] You can access http://localhost:3000

---

## 🔐 PHASE 1: AUTHENTICATION TESTING

### Test 1.1: Admin Login

**Step 1:** Open http://localhost:3000
**Step 2:** Login with credentials:

- Username: `admin`
- Password: `Admin@123`

**Expected Results:**

- ✅ Page redirects to `/admin/dashboard`
- ✅ Admin sees dashboard with statistics
- ✅ Sidebar shows "Admin Panel"

**API Call:**

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"Admin@123"}'
```

---

### Test 1.2: Faculty Login

**Step 1:** Logout (use logout button in UI or clear localStorage)
**Step 2:** Login with:

- Username: `faculty1`
- Password: `Faculty@123`

**Expected Results:**

- ✅ Page redirects to `/faculty/dashboard`
- ✅ Faculty sees "My Skills" section
- ✅ Shows assigned skills

---

### Test 1.3: Student Login

**Step 1:** Logout
**Step 2:** Login with:

- Username: `student1`
- Password: `Student@123`

**Expected Results:**

- ✅ Page redirects to `/student/dashboard`
- ✅ Student sees enrolled skills
- ✅ Shows progress percentages

---

## 👨‍💼 PHASE 2: ADMIN WORKFLOW

### Test 2.1: Create New Skill

**Step 1:** Login as admin
**Step 2:** Navigate to "Skills Management" or click on skills card

**API Call:**

```bash
TOKEN="your_admin_token_here"
curl -X POST http://localhost:5000/api/v1/admin/skills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skillCode":"TEST-001",
    "name":"Test Skill",
    "description":"This is a test skill for verification",
    "durationWeeks":4
  }'
```

**Expected Results:**

- ✅ Skill created successfully
- ✅ Status: "draft"
- ✅ Can be found in skills list

---

### Test 2.2: View All Skills

**API Call:**

```bash
curl -X GET "http://localhost:5000/api/v1/admin/skills?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Results:**

- ✅ Returns list of skills with pagination
- ✅ Shows skill details: code, name, status
- ✅ Includes faculty assignments

---

### Test 2.3: Assign Faculty to Skill

**API Call:**

```bash
SKILL_ID="skill-uuid-here"
FACULTY_ID="faculty1-uuid-here"

curl -X POST "http://localhost:5000/api/v1/admin/skills/$SKILL_ID/faculty" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "facultyId":"'$FACULTY_ID'",
    "isPrimary":true
  }'
```

**Expected Results:**

- ✅ Faculty assigned to skill
- ✅ Faculty marked as primary
- ✅ Can view in skill details

---

### Test 2.4: Create User (Student)

**API Call:**

```bash
curl -X POST http://localhost:5000/api/v1/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName":"Test Student",
    "email":"teststudent@hlms.com",
    "username":"teststudent",
    "password":"TestPass@123",
    "roll_number":"2024099",
    "role":"student"
  }'
```

**Expected Results:**

- ✅ Student created successfully
- ✅ Can login with new credentials
- ✅ User appears in student list

---

### Test 2.5: Bulk Upload Students

**Step 1:** Create CSV file with format:

```csv
full_name,email,phone,roll_number,group_code
John Doe,john@hlms.com,9876543210,2024001,BATCH-001
Jane Smith,jane@hlms.com,9876543211,2024002,BATCH-001
```

**API Call:**

```bash
curl -X POST http://localhost:5000/api/v1/admin/students/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@students.csv"
```

**Expected Results:**

- ✅ CSV parsed successfully
- ✅ Students created with auto-generated passwords
- ✅ Credentials sent to provided emails

---

### Test 2.6: View Admin Dashboard

**API Call:**

```bash
curl -X GET http://localhost:5000/api/v1/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Results:**

```json
{
  "success": true,
  "data": {
    "totalUsers": 13,
    "totalSkills": 3,
    "activeStudents": 10,
    "totalFaculty": 2,
    "completedSkills": 0,
    "pendingApprovals": 0
  }
}
```

---

## 👨‍🏫 PHASE 3: FACULTY WORKFLOW

### Test 3.1: Faculty Login

**Use:** faculty1 / Faculty@123

---

### Test 3.2: View Assigned Skills

**API Call:**

```bash
FACULTY_TOKEN="faculty_token_here"

curl -X GET http://localhost:5000/api/v1/faculty/skills \
  -H "Authorization: Bearer $FACULTY_TOKEN"
```

**Expected Results:**

```json
{
  "success": true,
  "data": [
    {
      "id": "skill-uuid",
      "name": "Web Development Fundamentals",
      "description": "Learn web development basics",
      "_count": {
        "chapters": 2,
        "tasks": 3,
        "studentSkills": 5
      }
    }
  ]
}
```

---

### Test 3.3: Create Chapter

**API Call:**

```bash
SKILL_ID="skill-uuid"

curl -X POST "http://localhost:5000/api/v1/faculty/skills/$SKILL_ID/chapters" \
  -H "Authorization: Bearer $FACULTY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Getting Started with Web Dev",
    "description":"Introduction to HTML, CSS, JavaScript",
    "chapter_number":1
  }'
```

**Expected Results:**

- ✅ Chapter created successfully
- ✅ Chapter number auto-incremented
- ✅ Shows in skill's chapter list

---

### Test 3.4: Create Lesson with Video Upload

**Step 1:** Prepare video file (MP4, <500MB, max 30 min duration)

**API Call:**

```bash
CHAPTER_ID="chapter-uuid"

curl -X POST "http://localhost:5000/api/v1/faculty/chapters/$CHAPTER_ID/lessons" \
  -H "Authorization: Bearer $FACULTY_TOKEN" \
  -F "title=Introduction to HTML" \
  -F "description=Learn HTML basics and structure" \
  -F "lesson_number=1" \
  -F "video=@sample_video.mp4"
```

**Expected Results:**

- ✅ Video validates successfully
- ✅ Returns validation results:
  - Format: MP4 ✓
  - Duration: 12:34 ✓
  - Size: Valid ✓
  - Resolution: 1080p ✓
- ✅ Lesson created with video URL

---

### Test 3.5: Create Task with Rubric

**API Call:**

```bash
SKILL_ID="skill-uuid"

curl -X POST "http://localhost:5000/api/v1/faculty/skills/$SKILL_ID/tasks" \
  -H "Authorization: Bearer $FACULTY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Build a Simple Web Page",
    "description":"Create an HTML/CSS web page with your name",
    "task_number":1,
    "max_marks":10,
    "passing_marks":5,
    "submission_type":"file",
    "allowed_file_types":["zip", "rar"],
    "rubric":[
      {
        "name":"Code Quality",
        "weight":4,
        "description":"Code is clean and well-structured"
      },
      {
        "name":"Functionality",
        "weight":3,
        "description":"Page works as expected"
      },
      {
        "name":"Styling",
        "weight":2,
        "description":"CSS is properly applied"
      },
      {
        "name":"Documentation",
        "weight":1,
        "description":"Code has comments"
      }
    ]
  }'
```

**Expected Results:**

- ✅ Task created with 10 marks max
- ✅ Rubric weights total 10
- ✅ Task appears in skill's task list

---

### Test 3.6: View Student Submissions

**API Call:**

```bash
curl -X GET "http://localhost:5000/api/v1/faculty/assessments" \
  -H "Authorization: Bearer $FACULTY_TOKEN"
```

**Expected Results:**

- ✅ Lists all student submissions
- ✅ Shows pending assessments
- ✅ Includes student name, submission file, date

---

### Test 3.7: Grade Student Submission

**API Call:**

```bash
ASSESSMENT_ID="assessment-uuid"

curl -X POST "http://localhost:5000/api/v1/faculty/assessments/$ASSESSMENT_ID/evaluate" \
  -H "Authorization: Bearer $FACULTY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "marks_obtained":8.5,
    "rubric_scores":{
      "Code Quality":3.5,
      "Functionality":3,
      "Styling":2,
      "Documentation":0.5
    },
    "faculty_feedback":"Good work! Very helpful refactoring suggestions in next submission."
  }'
```

**Expected Results:**

- ✅ Submission graded successfully
- ✅ Marks recorded
- ✅ Feedback saved
- ✅ Student can view grades

---

## 👨‍🎓 PHASE 4: STUDENT WORKFLOW

### Test 4.1: Student Login

**Use:** student1 / Student@123

---

### Test 4.2: View Enrolled Skills

**API Call:**

```bash
STUDENT_TOKEN="student_token"

curl -X GET http://localhost:5000/api/v1/student/skills \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

**Expected Results:**

```json
{
  "success": true,
  "data": [
    {
      "id": "skill-uuid",
      "name": "Web Development Fundamentals",
      "progress_percentage": 35,
      "completed_tasks": 3,
      "total_tasks": 10,
      "chapters": [...],
      "tasks": [...]
    }
  ]
}
```

---

### Test 4.3: Watch Lesson Video

**API Call:**

```bash
LESSON_ID="lesson-uuid"

curl -X GET "http://localhost:5000/api/v1/student/lessons/$LESSON_ID" \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

**Expected Results:**

- ✅ Returns lesson details
- ✅ Includes video URL
- ✅ Shows current progress (if watched before)
- ✅ Resume from last position

---

### Test 4.4: Track Video Progress

**API Call (simulate after watching 50% of video):**

```bash
curl -X POST "http://localhost:5000/api/v1/student/lessons/$LESSON_ID/progress" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "position":300,
    "isCompleted":false
  }'
```

**Expected Results:**

- ✅ Progress recorded (50%)
- ✅ Current position saved (300 seconds)
- ✅ Can resume from this point

---

### Test 4.5: Submit Task

**Prepare:** ZIP file with HTML/CSS code

**API Call:**

```bash
TASK_ID="task-uuid"

curl -X POST "http://localhost:5000/api/v1/student/tasks/$TASK_ID/submit" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -F "submission_text=I completed the task as per requirements" \
  -F "submission_file=@mywork.zip"
```

**Expected Results:**

- ✅ Task submitted successfully
- ✅ File validated (size, format)
- ✅ Submission recorded with timestamp
- ✅ Faculty notified of new submission

---

### Test 4.6: View Grades & Feedback

**API Call:**

```bash
curl -X GET http://localhost:5000/api/v1/student/grades \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

**Expected Results:**

```json
{
  "success": true,
  "data": [
    {
      "task_id": "task-uuid",
      "title": "Build a Simple Web Page",
      "marks_obtained": 8.5,
      "max_marks": 10,
      "percentage": 85,
      "faculty_feedback": "Good work!...",
      "rubric_breakdown": {...}
    }
  ]
}
```

---

### Test 4.7: Check Overall Progress

**API Call:**

```bash
curl -X GET http://localhost:5000/api/v1/student/skills \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

**Verify:**

- ✅ Progress updates after submission
- ✅ Shows completed tasks count
- ✅ Calculates percentage correctly

---

### Test 4.8: Submit Weekly Progress Log

**API Call:**

```bash
SKILL_ID="skill-uuid"
WEEK_NUMBER=1

curl -X POST "http://localhost:5000/api/v1/student/skills/$SKILL_ID/progress-logs" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "work_done":"Completed HTML basics, learned about tags and attributes",
    "challenges_faced":"Initial confusion with CSS selectors",
    "next_plan":"Learn CSS Flexbox and Grid layouts"
  }'
```

**Expected Results:**

- ✅ Log submitted successfully
- ✅ Faculty can review it
- ✅ Marked as pending review

---

### Test 4.9: View and Download Certificate

**API Call (only if skill is 100% complete):**

```bash
curl -X GET http://localhost:5000/api/v1/student/certificates \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

**Expected Results:**

- ✅ Lists all earned certificates
- ✅ Shows certificate details: skill name, date, percentage
- ✅ Can download PDF

---

## 📊 PHASE 5: DATA & REPORTING

### Test 5.1: Admin Report - Skill Analytics

**API Call:**

```bash
curl -X GET "http://localhost:5000/api/v1/admin/reports/skill/$SKILL_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Results:**

```json
{
  "skill_name": "Web Development",
  "total_enrolled": 5,
  "completed": 1,
  "completion_rate": 20,
  "average_marks": 7.8,
  "students": [...]
}
```

---

### Test 5.2: Export to CSV

**Endpoint:**

```
GET http://localhost:5000/api/v1/admin/reports/skill/{skillId}?format=csv
```

**Expected Results:**

- ✅ Returns CSV file
- ✅ Can be opened in Excel
- ✅ Contains student data

---

## 🔄 PHASE 6: REAL-TIME FEATURES

### Test 6.1: Socket.io Connection

**Test from browser console:**

```javascript
// The socket should automatically connect
// You should see in Network tab:
// - WebSocket connection to /socket.io
// - Initial connection message
```

---

### Test 6.2: Real-time Notifications

**When admin grades a task, student should receive:**

- ✅ Toast notification on screen
- ✅ Browser notification (if enabled)
- ✅ Notification appears in notification center

---

## ✅ FINAL VERIFICATION CHECKLIST

- [ ] Admin can create skills
- [ ] Faculty can create chapters & lessons
- [ ] Faculty can upload videos
- [ ] Faculty can create tasks with rubrics
- [ ] Faculty can grade submissions
- [ ] Student can enroll in skills
- [ ] Student can watch videos with progress tracking
- [ ] Student can submit tasks
- [ ] Student can view grades & feedback
- [ ] Student can download certificates
- [ ] Real-time notifications work
- [ ] All API endpoints respond
- [ ] Database queries are fast (<200ms)
- [ ] No console errors in browser
- [ ] No server errors in terminal

---

## 🎯 SUCCESS CRITERIA

✅ **System is working perfectly if:**

1. All 80 API endpoints respond correctly
2. Database operations are fast and accurate
3. UI renders without errors
4. Real-time updates work (Socket.io)
5. File uploads work (video, documents)
6. Role-based access control works
7. Progress tracking is accurate
8. Certificate generation works
9. Email notifications work
10. No data loss during operations

---

## 🐛 TROUBLESHOOTING

### If API returns 401

- [ ] Check token is still valid (7 days expiry)
- [ ] Re-login to get new token
- [ ] Check Authorization header format: `Bearer <token>`

### If video upload fails

- [ ] Check file format (MP4, WebM, MOV only)
- [ ] Check file size (<500MB)
- [ ] Check duration (<30 minutes)
- [ ] Check resolution (720p+)

### If certificate doesn't generate

- [ ] Verify student has 100% progress
- [ ] Check all tasks are graded
- [ ] Check database space available
- [ ] Review server logs

---

## 📝 TEST RESULTS LOG

**Date:** ******\_\_\_\_******
**Tester:** ******\_\_\_\_******

| Test                 | Status | Notes |
| -------------------- | ------ | ----- |
| Admin login          | ⬜     |       |
| Faculty login        | ⬜     |       |
| Student login        | ⬜     |       |
| Create skill         | ⬜     |       |
| Upload video         | ⬜     |       |
| Create task          | ⬜     |       |
| Submit task          | ⬜     |       |
| Grade submission     | ⬜     |       |
| View progress        | ⬜     |       |
| Download certificate | ⬜     |       |

---

**Testing Complete! ✅**

If all tests pass, the system is production-ready!
