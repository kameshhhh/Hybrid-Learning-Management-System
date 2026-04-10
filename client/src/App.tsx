/**
 * ============================================================
 * HLMS - MAIN APPLICATION
 * ============================================================
 *
 * This is the root component of the HLMS application.
 * It sets up:
 * - React Router for navigation
 * - Toast notifications
 * - Authentication checking
 * - Route protection based on user roles
 *
 * ============================================================
 */

import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { DashboardLayout } from "@/components/shared";

// Auth Pages
import LoginPage from "@/pages/auth/LoginPage";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import SkillManagementPage from "@/pages/admin/SkillManagementPage";
import StudentManagementPage from "@/pages/admin/StudentManagementPage";
import ReportsPage from "@/pages/admin/ReportsPage";

// Faculty Pages
import FacultyDashboard from "@/pages/faculty/FacultyDashboard";
import FacultySkillsPage from "@/pages/faculty/FacultySkillsPage";
import CourseBuilder from "@/pages/faculty/CourseBuilder";
import Gradebook from "@/pages/faculty/Gradebook";
import TaskEvaluator from "@/pages/faculty/TaskEvaluator";
import TestCourseBuilder from "@/pages/faculty/TestCourseBuilder";

// Admin Pages extension
import FacultyManagementPage from "@/pages/admin/FacultyManagementPage";

// Faculty Pages extension
import ReviewLogsPage from "@/pages/faculty/ReviewLogsPage";
import MyStudentsPage from "@/pages/faculty/MyStudentsPage";
import FacultyStudentProfile from "@/pages/faculty/FacultyStudentProfile";

// Student Pages
import {
  StudentDashboard,
  AllSkillsPage,
  StudentSkillDetailPage,
  StudentTasksPage,
  TaskSubmission,
  VideoPlayerPage,
  ProgressLogsPage,
  CertificatesPage,
} from "@/pages/student";
import StudentTestCourseView from "@/pages/student/StudentTestCourseView";

// Placeholder pages (to be implemented)
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="text-center py-20">
    <h2 className="text-2xl font-bold text-slate-700">{title}</h2>
    <p className="text-slate-500 mt-2">This page is coming soon!</p>
  </div>
);

/**
 * ProtectedRoute Component
 *
 * Wraps routes that require authentication.
 * Redirects to login if user is not authenticated.
 * Can also check for specific roles.
 */
interface ProtectedRouteProps {
  allowedRoles?: ("admin" | "faculty" | "student")[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-fuchsia-100 to-green-100">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role if specified
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard
    return <Navigate to={`/${user.role}`} replace />;
  }

  // Render child routes
  return <Outlet />;
};

/**
 * PublicRoute Component
 *
 * Wraps routes that should only be accessible when NOT authenticated.
 * Redirects to dashboard if user is already logged in.
 */
const PublicRoute = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <Outlet />;
};

/**
 * App Component
 *
 * The root component that sets up routing and global providers.
 */
function App() {
  const { checkAuth, isAuthenticated, user } = useAuthStore();

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
    
    // Initialize High-Integrity Time Engine
    import("@/services/time").then(m => m.initializeTimeEngine());
    
    // Attempt replay of pending syncs from previous potentially crashed sessions
    import("@/services/syncService").then(m => m.replayPendingSyncs());
  }, [checkAuth]);

  return (
    <BrowserRouter>
      {/* Toast notifications container */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes - Only accessible when NOT logged in */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Admin Routes - Only accessible by admins */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<DashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="skills" element={<SkillManagementPage />} />
            <Route path="skills/:skillId/builder" element={<CourseBuilder />} />
            <Route path="skills/:skillId/workspace" element={<TestCourseBuilder />} />
            <Route path="faculty" element={<FacultyManagementPage />} />
            <Route path="students" element={<StudentManagementPage />} />
            <Route
              path="groups"
              element={<PlaceholderPage title="Groups Management" />}
            />
            <Route
              path="approvals"
              element={<PlaceholderPage title="Content Approvals" />}
            />
            <Route path="reports" element={<ReportsPage />} />
            <Route
              path="settings"
              element={<PlaceholderPage title="Settings" />}
            />
          </Route>
        </Route>

        {/* Faculty Routes - Only accessible by faculty */}
        <Route element={<ProtectedRoute allowedRoles={["faculty"]} />}>
          <Route path="/faculty" element={<DashboardLayout />}>
            <Route index element={<FacultyDashboard />} />
            <Route path="skills" element={<FacultySkillsPage />} />
            <Route path="skills/:skillId" element={<CourseBuilder />} />
            <Route path="assessments" element={<Gradebook />} />
            <Route
              path="assessments/:assessmentId"
              element={<TaskEvaluator />}
            />
            <Route path="students" element={<MyStudentsPage />} />
            <Route path="skills/:skillId/workspace" element={<TestCourseBuilder />} />
            <Route path="skills/:skillId/students/:studentId" element={<FacultyStudentProfile />} />
            <Route path="logs" element={<ReviewLogsPage />} />
            <Route
              path="reports"
              element={<PlaceholderPage title="Reports" />}
            />
          </Route>
        </Route>

        {/* Student Routes - Only accessible by students */}
        <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
          <Route path="/student" element={<DashboardLayout />}>
            <Route index element={<StudentDashboard />} />
            <Route path="skills" element={<AllSkillsPage />} />
            <Route
              path="skills/:skillId"
              element={<StudentSkillDetailPage />}
            />
            <Route path="skills/:skillId/workspace" element={<StudentTestCourseView />} />
            <Route path="tasks" element={<StudentTasksPage />} />
            <Route path="tasks/:taskId" element={<TaskSubmission />} />
            <Route path="lessons/:lessonId" element={<VideoPlayerPage />} />
            <Route path="progress" element={<ProgressLogsPage />} />
            <Route path="certificates" element={<CertificatesPage />} />
          </Route>
        </Route>

        {/* Root redirect - Go to login or dashboard based on auth status */}
        <Route
          path="/"
          element={
            isAuthenticated && user ? (
              <Navigate to={`/${user.role}`} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 404 - Page not found */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-fuchsia-100 to-green-100">
              <div className="text-center">
                <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                  404
                </h1>
                <p className="text-slate-500 mt-4">Page not found</p>
                <a
                  href="/"
                  className="inline-block mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-medium"
                >
                  Go Home
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
