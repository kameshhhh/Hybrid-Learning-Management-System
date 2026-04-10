/**
 * ============================================================
 * BUTTON COMPONENT
 * ============================================================
 *
 * A reusable button component following the Velox Design System.
 * Supports multiple variants, sizes, and states.
 *
 * Design Specifications:
 * - Primary: Gradient background (purple to blue)
 * - Secondary: Glass effect with purple text
 * - Ghost: Transparent with hover effect
 * - All buttons have smooth hover transitions
 *
 * ============================================================
 */

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * ButtonVariant - Available button styles
 * - primary: Gradient background, white text (main CTAs)
 * - secondary: Glass background, purple text (secondary actions)
 * - outline: Border only with transparent background
 * - ghost: Transparent, subtle hover (tertiary actions)
 * - danger: Red gradient for destructive actions
 */
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

/**
 * ButtonSize - Available button sizes
 * - sm: Compact, for inline actions
 * - md: Default size
 * - lg: Large, for hero sections
 * - icon: Square button for icons only
 */
type ButtonSize = "sm" | "md" | "lg" | "icon";

/**
 * ButtonProps - Props for the Button component
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The visual style of the button */
  variant?: ButtonVariant;
  /** The size of the button */
  size?: ButtonSize;
  /** Shows a loading spinner and disables the button */
  isLoading?: boolean;
  /** Icon to display before the text */
  leftIcon?: React.ReactNode;
  /** Icon to display after the text */
  rightIcon?: React.ReactNode;
  /** Makes the button take full width */
  fullWidth?: boolean;
}

/**
 * Variant class mappings
 * Each variant gets its own set of Tailwind/CSS classes
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-purple-500 to-blue-500
    text-white font-semibold
    shadow-[0_10px_20px_rgba(99,102,241,0.2)]
    hover:shadow-[0_15px_25px_rgba(99,102,241,0.3)]
    hover:-translate-y-0.5
    active:translate-y-0
    disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
  `,
  secondary: `
    bg-white/60 backdrop-blur-xl
    border border-white/80
    text-purple-500 font-semibold
    hover:bg-white/80
    hover:-translate-y-0.5
    disabled:opacity-60 disabled:cursor-not-allowed
  `,
  outline: `
    bg-transparent
    border-2 border-purple-500
    text-purple-500 font-semibold
    hover:bg-purple-50
    hover:-translate-y-0.5
    disabled:opacity-60 disabled:cursor-not-allowed
  `,
  ghost: `
    bg-transparent
    text-slate-600 font-medium
    hover:text-purple-500
    hover:bg-purple-50/50
    disabled:opacity-60 disabled:cursor-not-allowed
  `,
  danger: `
    bg-gradient-to-r from-red-500 to-rose-500
    text-white font-semibold
    shadow-[0_10px_20px_rgba(239,68,68,0.2)]
    hover:shadow-[0_15px_25px_rgba(239,68,68,0.3)]
    hover:-translate-y-0.5
    active:translate-y-0
    disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
  `,
};

/**
 * Size class mappings
 * Defines padding, font size, and dimensions for each size
 */
const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-5 py-2.5 text-sm rounded-full",
  md: "px-8 py-3.5 text-base rounded-full",
  lg: "px-10 py-4 text-lg rounded-full",
  icon: "w-10 h-10 p-0 rounded-xl flex items-center justify-center",
};

/**
 * Button Component
 *
 * A versatile button component that follows the Velox glassmorphism design.
 *
 * @example
 * // Primary button (main CTA)
 * <Button variant="primary" onClick={handleSubmit}>
 *   Submit
 * </Button>
 *
 * @example
 * // With loading state
 * <Button variant="primary" isLoading={isSubmitting}>
 *   {isSubmitting ? 'Saving...' : 'Save'}
 * </Button>
 *
 * @example
 * // With icons
 * <Button leftIcon={<Plus />} variant="primary">
 *   Add New
 * </Button>
 *
 * @example
 * // Icon only button
 * <Button variant="secondary" size="icon">
 *   <Settings />
 * </Button>
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center gap-2",
          "transition-all duration-300 ease-out",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
          // Variant styles
          variantClasses[variant],
          // Size styles
          sizeClasses[size],
          // Full width
          fullWidth && "w-full",
          // Loading state
          isLoading && "cursor-wait",
          // Custom classes
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {/* Loading spinner - replaces left icon when loading */}
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}

        {/* Button text */}
        {children}

        {/* Right icon - hidden when loading */}
        {!isLoading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
