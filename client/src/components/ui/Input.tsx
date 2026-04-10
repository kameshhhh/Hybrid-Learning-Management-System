/**
 * ============================================================
 * INPUT COMPONENT
 * ============================================================
 *
 * A reusable input component following the Velox Design System.
 * Features the glassmorphism style with subtle borders.
 *
 * Design Specifications:
 * - Background: rgba(255, 255, 255, 0.8) - Glass effect
 * - Border: 1px solid rgba(0, 0, 0, 0.1)
 * - Border radius: 16px
 * - Focus: Purple border with subtle glow
 *
 * ============================================================
 */

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * InputProps - Props for the Input component
 */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input */
  label?: string;
  /** Error message to display below the input */
  error?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Icon to display on the left side of the input */
  leftIcon?: React.ReactNode;
  /** Icon to display on the right side of the input */
  rightIcon?: React.ReactNode;
  /** Makes the input take full width (default: true) */
  fullWidth?: boolean;
}

/**
 * Input Component
 *
 * A styled input field with glassmorphism effect and optional
 * label, icons, error states, and helper text.
 *
 * @example
 * // Basic input
 * <Input placeholder="Enter your email" />
 *
 * @example
 * // With label and error
 * <Input
 *   label="Email Address"
 *   type="email"
 *   error={errors.email}
 *   placeholder="you@example.com"
 * />
 *
 * @example
 * // With icons
 * <Input
 *   leftIcon={<Mail />}
 *   rightIcon={<Check />}
 *   placeholder="Enter email"
 * />
 *
 * @example
 * // Password input with toggle (using rightIcon)
 * <Input
 *   type={showPassword ? 'text' : 'password'}
 *   rightIcon={
 *     <button onClick={togglePassword}>
 *       {showPassword ? <EyeOff /> : <Eye />}
 *     </button>
 *   }
 * />
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      id,
      ...props
    },
    ref,
  ) => {
    // Generate a unique ID for the input if not provided
    // This connects the label to the input for accessibility
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={cn("flex flex-col gap-2", fullWidth && "w-full")}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-800"
          >
            {label}
          </label>
        )}

        {/* Input wrapper - handles icons and input positioning */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}

          {/* The actual input element */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base styles - Glass effect
              "w-full bg-white/80 backdrop-blur-sm",
              "border border-black/10 rounded-2xl",
              "px-5 py-3.5 text-base text-slate-800",
              "placeholder:text-slate-400",
              // Transition for smooth focus effect
              "transition-all duration-200",
              // Focus state - Purple border with glow
              "focus:outline-none focus:border-purple-500",
              "focus:ring-4 focus:ring-purple-500/10",
              // Error state - Red border
              error &&
                "border-red-400 focus:border-red-500 focus:ring-red-500/10",
              // Disabled state
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50",
              // Padding adjustments for icons
              leftIcon && "pl-12",
              rightIcon && "pr-12",
              // Custom classes
              className,
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            {...props}
          />

          {/* Right icon */}
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-red-500 flex items-center gap-1"
            role="alert"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {/* Helper text - only shown if no error */}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input, type InputProps };
