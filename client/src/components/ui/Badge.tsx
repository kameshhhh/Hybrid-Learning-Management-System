/**
 * ============================================================
 * BADGE COMPONENT
 * ============================================================
 *
 * Small status indicators and labels following the Velox Design.
 * Used for status indicators, counts, and tags.
 *
 * Design Specifications:
 * - Rounded pill shape
 * - Subtle background tints
 * - Small, readable text
 *
 * ============================================================
 */

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * BadgeVariant - Available badge styles
 */
type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "purple";

/**
 * BadgeSize - Badge sizes
 */
type BadgeSize = "sm" | "md" | "lg";

/**
 * BadgeProps - Props for the Badge component
 */
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** The color variant of the badge */
  variant?: BadgeVariant;
  /** The size of the badge */
  size?: BadgeSize;
  /** Optional dot indicator before text */
  dot?: boolean;
  /** Optional icon to display alongside text */
  icon?: React.ReactNode;
}

/**
 * Variant class mappings
 */
const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-600",
  secondary: "bg-gray-100 text-gray-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
};

/**
 * Dot color mappings
 */
const dotClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-400",
  secondary: "bg-gray-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  purple: "bg-purple-500",
};

/**
 * Size class mappings
 */
const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-xs",
  lg: "px-4 py-1.5 text-sm",
};

/**
 * Badge Component
 *
 * A small label component for status indicators and tags.
 *
 * @example
 * // Success status
 * <Badge variant="success">Completed</Badge>
 *
 * @example
 * // With dot indicator
 * <Badge variant="info" dot>Active</Badge>
 *
 * @example
 * // Error status
 * <Badge variant="error">Failed</Badge>
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      dot = false,
      icon,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center gap-1.5 font-medium rounded-full",
          // Variant styles
          variantClasses[variant],
          // Size styles
          sizeClasses[size],
          // Custom classes
          className,
        )}
        {...props}
      >
        {/* Optional dot indicator */}
        {dot && (
          <span
            className={cn("w-1.5 h-1.5 rounded-full", dotClasses[variant])}
          />
        )}
        {/* Optional icon */}
        {icon && (
          <span className="flex items-center justify-center">{icon}</span>
        )}
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";

export { Badge, type BadgeProps, type BadgeVariant, type BadgeSize };
