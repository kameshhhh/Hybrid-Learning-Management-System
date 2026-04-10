/**
 * ============================================================
 * GLASS CARD COMPONENT
 * ============================================================
 *
 * The signature component of the Velox Design System.
 * Creates beautiful glassmorphism cards with blur effect.
 *
 * Design Specifications:
 * - Background: rgba(255, 255, 255, 0.6) or 0.4 for secondary
 * - Backdrop blur: 24px (primary) or 16px (secondary)
 * - Border: 1px solid rgba(255, 255, 255, 0.8)
 * - Border radius: 40px (primary) or 30px (secondary)
 * - Box shadow: Subtle shadow with inset highlight
 *
 * ============================================================
 */

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * GlassVariant - Available glass card styles
 * - primary: Main containers (rgba 0.6, blur 24px)
 * - secondary: Secondary panels (rgba 0.4, blur 16px)
 * - card: Smaller cards in grids (rgba 0.5, blur 12px)
 */
type GlassVariant = "primary" | "secondary" | "card";

/**
 * GlassCardProps - Props for the GlassCard component
 */
interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** The intensity of the glass effect */
  variant?: GlassVariant;
  /** Whether the card should have hover effects */
  hoverable?: boolean;
  /** Custom padding (uses Tailwind classes) */
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  /** Whether to animate in when mounted */
  animate?: boolean;
}

/**
 * Variant class mappings
 * Each variant has its own glass effect intensity
 */
const variantClasses: Record<GlassVariant, string> = {
  primary: `
    bg-white/60 backdrop-blur-[24px]
    border border-white/80
    rounded-[40px]
    shadow-[0_20px_40px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,1)]
  `,
  secondary: `
    bg-white/40 backdrop-blur-[16px]
    border border-white/60
    rounded-[30px]
    shadow-[0_10px_30px_rgba(0,0,0,0.02)]
  `,
  card: `
    bg-white/50 backdrop-blur-[12px]
    border border-white/60
    rounded-[20px]
    shadow-[0_8px_24px_rgba(0,0,0,0.02)]
  `,
};

/**
 * Padding class mappings
 */
const paddingClasses: Record<string, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  xl: "p-12",
};

/**
 * GlassCard Component
 *
 * A beautiful glassmorphism card component that forms the foundation
 * of the Velox UI. Use it for containers, panels, and card grids.
 *
 * @example
 * // Primary glass container (for hero sections)
 * <GlassCard variant="primary" padding="xl">
 *   <h1>Welcome</h1>
 *   <p>Content goes here</p>
 * </GlassCard>
 *
 * @example
 * // Secondary panel
 * <GlassCard variant="secondary" padding="lg">
 *   <h2>Section Title</h2>
 * </GlassCard>
 *
 * @example
 * // Hoverable card in a grid
 * <GlassCard variant="card" hoverable padding="md">
 *   <h3>Card Title</h3>
 * </GlassCard>
 *
 * @example
 * // With animation
 * <GlassCard variant="primary" animate>
 *   Fades in when mounted
 * </GlassCard>
 */
const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant = "card",
      hoverable = false,
      padding = "md",
      animate = false,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          "relative overflow-hidden",
          // Variant styles (glass effect)
          variantClasses[variant],
          // Padding
          paddingClasses[padding],
          // Hover effects
          hoverable && [
            "transition-all duration-300 ease-out",
            "hover:bg-white/70",
            "hover:-translate-y-0.5",
            "hover:shadow-[0_25px_50px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,1)]",
            "cursor-pointer",
          ],
          // Animation
          animate && "animate-fade-in",
          // Custom classes
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

GlassCard.displayName = "GlassCard";

/**
 * GlassCardHeader - Header section for GlassCard
 * Use for titles and actions at the top of a card
 */
interface GlassCardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Title text */
  title?: string;
  /** Subtitle or description */
  subtitle?: string;
  /** Action elements (buttons, links) */
  action?: React.ReactNode;
}

const GlassCardHeader = forwardRef<HTMLDivElement, GlassCardHeaderProps>(
  ({ className, title, subtitle, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-start justify-between gap-4 mb-6", className)}
        {...props}
      >
        <div>
          {title && (
            <h3 className="text-xl font-semibold text-slate-800 bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
          {children}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  },
);

GlassCardHeader.displayName = "GlassCardHeader";

/**
 * GlassCardContent - Content section for GlassCard
 * Main content area of the card
 */
const GlassCardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("", className)} {...props}>
      {children}
    </div>
  );
});

GlassCardContent.displayName = "GlassCardContent";

/**
 * GlassCardFooter - Footer section for GlassCard
 * Use for actions at the bottom of a card
 */
const GlassCardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-4 mt-6 pt-4 border-t border-black/5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

GlassCardFooter.displayName = "GlassCardFooter";

export {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
  GlassCardFooter,
  type GlassCardProps,
  type GlassVariant,
};
