/**
 * ============================================================
 * DASHBOARD LAYOUT COMPONENT
 * ============================================================
 *
 * The main layout wrapper for all dashboard pages.
 * Includes:
 * - Sidebar navigation
 * - Top header with user info
 * - Main content area
 * - Aurora gradient background
 *
 * This layout is used by:
 * - Admin Dashboard
 * - Faculty Dashboard
 * - Student Dashboard
 *
 * ============================================================
 */

import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { useAuthStore } from "@/store/authStore";
import { Bell, Search } from "lucide-react";

/**
 * DashboardLayout Component
 *
 * Wraps dashboard pages with consistent layout including
 * sidebar, header, and the aurora gradient background.
 *
 * The content area automatically adjusts for sidebar width.
 *
 * @example
 * // In router configuration
 * {
 *   path: '/admin',
 *   element: <DashboardLayout />,
 *   children: [
 *     { index: true, element: <AdminDashboard /> },
 *     { path: 'skills', element: <SkillsList /> },
 *   ]
 * }
 */
const DashboardLayout = () => {
  const { user } = useAuthStore();

  return (
    <div
      className={cn(
        // Full viewport with aurora gradient
        "min-h-screen",
        "bg-gradient-to-br from-sky-100 via-fuchsia-100 to-green-100",
        "bg-fixed",
      )}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area - Offset by sidebar width */}
      <div className="ml-[280px] min-h-screen flex flex-col">
        {/* Top Header */}
        <header
          className={cn(
            // Glass effect
            "bg-white/40 backdrop-blur-[16px]",
            "border-b border-white/60",
            // Layout
            "sticky top-0 z-30",
            "px-8 py-4",
            "flex items-center justify-between",
          )}
        >
          {/* Left: Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search..."
                className={cn(
                  "w-full",
                  "bg-white/60 backdrop-blur-sm",
                  "border border-white/80",
                  "rounded-xl",
                  "pl-11 pr-4 py-2.5",
                  "text-sm text-slate-700",
                  "placeholder:text-slate-400",
                  "focus:outline-none focus:border-purple-300",
                  "transition-all duration-200",
                )}
              />
            </div>
          </div>

          {/* Right: Notifications & User */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button
              className={cn(
                "relative",
                "w-10 h-10 rounded-xl",
                "bg-white/60 backdrop-blur-sm",
                "border border-white/80",
                "flex items-center justify-center",
                "text-slate-500",
                "hover:text-purple-500 hover:bg-white/80",
                "transition-all duration-200",
              )}
            >
              <Bell size={18} />
              {/* Notification dot */}
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-500" />
            </button>

            {/* User Avatar & Info */}
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className={cn(
                  "w-10 h-10 rounded-xl",
                  "bg-gradient-to-br from-purple-500 to-blue-500",
                  "flex items-center justify-center",
                  "text-white font-semibold text-sm",
                )}
              >
                {user?.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>

              {/* Name & Role */}
              <div className="hidden md:block">
                <p className="text-sm font-medium text-slate-800">
                  {user?.fullName}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {/* Outlet renders the child route component */}
          <Outlet />
        </main>

        {/* Footer */}
        <footer
          className={cn(
            "px-8 py-4",
            "text-center text-sm text-slate-400",
            "border-t border-white/40",
          )}
        >
          <p>
            © {new Date().getFullYear()} HLMS - Hybrid Learning Management
            System. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export { DashboardLayout };
