/**
 * ============================================================
 * SIDEBAR COMPONENT
 * ============================================================
 *
 * Navigation sidebar for dashboard layouts.
 * Features glassmorphism styling and role-based menu items.
 *
 * This sidebar is used in:
 * - Admin Dashboard
 * - Faculty Dashboard
 * - Student Dashboard
 *
 * Design Specifications:
 * - Glass effect with blur
 * - Fixed width (280px on desktop)
 * - Collapsible on tablet/mobile
 * - Active item has white tint background
 * - Smooth hover transitions
 *
 * ============================================================
 */

import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { socketService } from "@/services/socket";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Award,
  FileText,
  FolderKanban,
  CheckSquare,
} from "lucide-react";
import type { UserRole } from "@/types";

/**
 * MenuItem - A single navigation item
 */
interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number; // Optional notification count
}

/**
 * Menu items for each role
 * These define what each user type sees in their sidebar
 */
const menuItems: Record<UserRole, MenuItem[]> = {
  admin: [
    { label: "Dashboard", path: "/admin", icon: <LayoutDashboard size={20} /> },
    { label: "Skills", path: "/admin/skills", icon: <BookOpen size={20} /> },
    { label: "Faculty", path: "/admin/faculty", icon: <Users size={20} /> },
    {
      label: "Students",
      path: "/admin/students",
      icon: <GraduationCap size={20} />,
    },
    {
      label: "Groups",
      path: "/admin/groups",
      icon: <FolderKanban size={20} />,
    },
    {
      label: "Approvals",
      path: "/admin/approvals",
      icon: <CheckSquare size={20} />,
    },
    { label: "Reports", path: "/admin/reports", icon: <BarChart3 size={20} /> },
    {
      label: "Settings",
      path: "/admin/settings",
      icon: <Settings size={20} />,
    },
  ],
  faculty: [
    {
      label: "Dashboard",
      path: "/faculty",
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: "My Skills",
      path: "/faculty/skills",
      icon: <BookOpen size={20} />,
    },
    {
      label: "Assessments",
      path: "/faculty/assessments",
      icon: <ClipboardList size={20} />,
    },
    {
      label: "Students",
      path: "/faculty/students",
      icon: <GraduationCap size={20} />,
    },
    {
      label: "Progress Logs",
      path: "/faculty/logs",
      icon: <FileText size={20} />,
    },
    {
      label: "Reports",
      path: "/faculty/reports",
      icon: <BarChart3 size={20} />,
    },
  ],
  student: [
    {
      label: "Dashboard",
      path: "/student",
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: "My Skills",
      path: "/student/skills",
      icon: <BookOpen size={20} />,
    },
    {
      label: "Tasks",
      path: "/student/tasks",
      icon: <ClipboardList size={20} />,
    },
    {
      label: "Progress",
      path: "/student/progress",
      icon: <BarChart3 size={20} />,
    },
    {
      label: "Certificates",
      path: "/student/certificates",
      icon: <Award size={20} />,
    },
  ],
};

/**
 * Sidebar Component
 *
 * The main navigation sidebar for dashboard layouts.
 * Adapts menu items based on user role.
 *
 * @example
 * <Sidebar />
 */
const Sidebar = () => {
  // Get current user from auth store
  const { user, logout } = useAuthStore();
  const location = useLocation();

  // Sidebar collapsed state (for mobile/tablet)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    socketService.onNotification((count) => setNotifCount(count));
    setNotifCount(socketService.notificationCount);
  }, []);

  // Get menu items for current user's role
  const items = user ? menuItems[user.role] : [];

  /**
   * Handle logout
   * Calls the logout action and redirects to login
   */
  const handleLogout = async () => {
    await logout();
    // React Router will handle redirect via protected route
  };

  /**
   * Check if a path is currently active
   * Handles exact match for dashboard and starts-with for sub-routes
   */
  const isActive = (path: string) => {
    if (path === `/${user?.role}`) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        // Glass effect
        "bg-white/60 backdrop-blur-[24px]",
        "border-r border-white/80",
        // Layout
        "fixed left-0 top-0 h-screen",
        "flex flex-col",
        "z-40",
        // Width transition
        "transition-all duration-300",
        isCollapsed ? "w-20" : "w-[280px]",
      )}
    >
      {/* Logo Section */}
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-800">
              HLMS
              <span className="text-purple-500">.</span>
            </span>
          </div>
        )}

        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-8 h-8 rounded-lg",
            "flex items-center justify-center",
            "bg-white/50 hover:bg-white/80",
            "text-slate-500 hover:text-purple-500",
            "transition-all duration-200",
            isCollapsed && "mx-auto",
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* User Info (when expanded) */}
      {!isCollapsed && user && (
        <div className="px-4 pb-4">
          <div className="p-3 rounded-xl bg-white/40">
            <p className="text-sm font-medium text-slate-800 truncate">
              {user.fullName}
            </p>
            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={cn(
                  // Base styles
                  "flex items-center gap-3",
                  "px-4 py-3 rounded-xl",
                  "text-slate-600 font-medium",
                  "transition-all duration-200",
                  // Hover state
                  "hover:bg-white/60 hover:text-purple-600",
                  // Active state
                  isActive(item.path) && [
                    "bg-white/80 text-purple-600",
                    "shadow-sm",
                  ],
                  // Collapsed state
                  isCollapsed && "justify-center px-3",
                )}
              >
                {/* Icon */}
                <span
                  className={cn(
                    "flex-shrink-0",
                    isActive(item.path) && "text-purple-500",
                  )}
                >
                  {item.icon}
                </span>

                {/* Label (hidden when collapsed) */}
                {!isCollapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}

                {/* Badge (hidden when collapsed) */}
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-600">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section: Notifications & Logout */}
      <div className="p-3 border-t border-white/40">
        {/* Notifications */}
        <button
          className={cn(
            "w-full flex items-center gap-3",
            "px-4 py-3 rounded-xl",
            "text-slate-600 font-medium",
            "hover:bg-white/60 hover:text-purple-600",
            "transition-all duration-200",
            isCollapsed && "justify-center px-3",
          )}
          onClick={() => {
            socketService.notificationCount = 0;
            setNotifCount(0);
          }}
        >
          <div className="relative">
            <Bell size={20} />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </div>
          {!isCollapsed && <span>Notifications</span>}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3",
            "px-4 py-3 rounded-xl",
            "text-red-500 font-medium",
            "hover:bg-red-50 hover:text-red-600",
            "transition-all duration-200",
            isCollapsed && "justify-center px-3",
          )}
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export { Sidebar };
