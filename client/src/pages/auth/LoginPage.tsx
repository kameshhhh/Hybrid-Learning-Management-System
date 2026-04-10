/**
 * ============================================================
 * LOGIN PAGE
 * ============================================================
 *
 * The authentication page for all users (Admin, Faculty, Student).
 * Features the Velox glassmorphism design with:
 * - Aurora gradient background
 * - Central glass card for login form
 * - Gradient text headings
 * - Form validation
 * - Error handling for "already logged in" scenarios
 *
 * ============================================================
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { Button, Input, GlassCard } from "@/components/ui";
import { Eye, EyeOff, Lock, User, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

/**
 * Login Form Schema
 * Validates username and password before submission
 */
const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, "Username or email must be at least 3 characters")
    .max(50, "Username or email must be less than 50 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(50, "Password must be less than 50 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * LoginPage Component
 *
 * Handles user authentication with a beautiful glass UI.
 * Redirects to appropriate dashboard based on user role.
 */
const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  // Clear any existing errors on component mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Toggle password visibility
  const [showPassword, setShowPassword] = useState(false);

  // For "already logged in" scenario
  const [alreadyLoggedInInfo, setAlreadyLoggedInInfo] = useState<{
    device?: string;
    lastLogin?: string;
  } | null>(null);

  // React Hook Form setup with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  /**
   * Handle form submission
   * Calls login API and redirects based on user role
   */
  const onSubmit = async (data: LoginFormData) => {
    // Clear any previous errors
    clearError();
    setAlreadyLoggedInInfo(null);

    const result = await login(data);

    if (result.success && result.user) {
      // Show success toast
      toast.success(`Welcome back, ${result.user.fullName}!`);

      // Redirect based on role
      switch (result.user.role) {
        case "admin":
          navigate("/admin");
          break;
        case "faculty":
          navigate("/faculty");
          break;
        case "student":
          navigate("/student");
          break;
        default:
          navigate("/");
      }
    } else if (result.currentDevice) {
      // Already logged in on another device
      setAlreadyLoggedInInfo({
        device: result.currentDevice,
        lastLogin: result.lastLogin,
      });
    } else {
      // General error
      toast.error(result.error || "Login failed");
    }
  };

  return (
    <div
      className={cn(
        // Full screen with aurora gradient
        "min-h-screen w-full",
        "bg-gradient-to-br from-sky-100 via-fuchsia-100 to-green-100",
        "flex items-center justify-center",
        "p-4",
      )}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Abstract shape 1 */}
        <div
          className={cn(
            "absolute -top-20 -right-20",
            "w-96 h-96",
            "bg-gradient-to-br from-purple-400/30 to-blue-400/30",
            "rounded-[60px_120px_60px_120px]",
            "rotate-[-15deg]",
            "blur-3xl",
          )}
        />
        {/* Abstract shape 2 */}
        <div
          className={cn(
            "absolute -bottom-20 -left-20",
            "w-80 h-80",
            "bg-gradient-to-br from-fuchsia-400/20 to-green-400/20",
            "rounded-[80px_40px_80px_40px]",
            "rotate-[15deg]",
            "blur-3xl",
          )}
        />
      </div>

      {/* Login Card */}
      <GlassCard
        variant="primary"
        padding="xl"
        className="w-full max-w-md relative animate-fade-in"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              HLMS
            </span>
            <span className="text-purple-500">.</span>
          </h1>
          <p className="text-slate-500">Sign in to your account</p>
        </div>

        {/* Already Logged In Warning */}
        {alreadyLoggedInInfo && (
          <div
            className={cn(
              "mb-6 p-4 rounded-xl",
              "bg-amber-50 border border-amber-200",
              "flex items-start gap-3",
            )}
          >
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Already logged in on another device
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Device: {alreadyLoggedInInfo.device}
              </p>
              <p className="text-xs text-amber-600">
                Last login: {alreadyLoggedInInfo.lastLogin}
              </p>
              <p className="text-xs text-amber-700 mt-2">
                Contact your administrator to force logout.
              </p>
            </div>
          </div>
        )}

        {/* General Error Display */}
        {error && !alreadyLoggedInInfo && (
          <div
            className={cn(
              "mb-6 p-4 rounded-xl",
              "bg-red-50 border border-red-200",
              "flex items-center gap-3",
            )}
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Username Field */}
          <Input
            label="Username or Email"
            type="text"
            placeholder="Enter your username or email"
            leftIcon={<User size={18} />}
            error={errors.identifier?.message}
            {...register("identifier")}
          />

          {/* Password Field */}
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            leftIcon={<Lock size={18} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            error={errors.password?.message}
            {...register("password")}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            className="mt-6"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-black/5 text-center">
          <p className="text-sm text-slate-400">
            Hybrid Learning Management System
          </p>
          <p className="text-xs text-slate-400 mt-1">
            © {new Date().getFullYear()} All rights reserved
          </p>
        </div>
      </GlassCard>
    </div>
  );
};

export default LoginPage;
