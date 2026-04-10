/**
 * ============================================================
 * STATS CARD COMPONENT
 * ============================================================
 *
 * A specialized card for displaying statistics on dashboards.
 * Features the Velox glass effect with gradient accents.
 *
 * Used for:
 * - Total counts (students, skills, etc.)
 * - Progress indicators
 * - Quick metrics
 *
 * ============================================================
 */

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * TrendDirection - Shows if metric is improving or declining
 */
type TrendDirection = "up" | "down" | "neutral";

/**
 * StatsCardProps - Props for the StatsCard component
 */
interface StatsCardProps extends HTMLAttributes<HTMLDivElement> {
  /** The main title/label of the stat */
  title: string;
  /** The value to display (number or formatted string) */
  value: string | number;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Trend percentage change */
  trend?: number;
  /** Direction of trend */
  trendDirection?: TrendDirection;
  /** Optional description or context */
  description?: string;
  /** Background accent color (uses gradient) */
  accentColor?: "purple" | "blue" | "green" | "orange";
}

/**
 * Accent color mappings for icon backgrounds
 */
const accentClasses: Record<string, string> = {
  purple: "from-purple-500/20 to-purple-500/5 text-purple-600",
  blue: "from-blue-500/20 to-blue-500/5 text-blue-600",
  green: "from-emerald-500/20 to-emerald-500/5 text-emerald-600",
  orange: "from-orange-500/20 to-orange-500/5 text-orange-600",
};

/**
 * Trend color mappings
 */
const trendClasses: Record<TrendDirection, string> = {
  up: "text-emerald-600 bg-emerald-100",
  down: "text-red-600 bg-red-100",
  neutral: "text-slate-600 bg-slate-100",
};

/**
 * StatsCard Component
 *
 * Displays a single metric/statistic in a beautiful glass card.
 *
 * @example
 * // Basic stat
 * <StatsCard
 *   title="Total Students"
 *   value="156"
 *   icon={<Users />}
 * />
 *
 * @example
 * // With trend indicator
 * <StatsCard
 *   title="Completions"
 *   value="89"
 *   icon={<Award />}
 *   trend={12}
 *   trendDirection="up"
 *   description="vs last month"
 * />
 *
 * @example
 * // With accent color
 * <StatsCard
 *   title="Active Skills"
 *   value="24"
 *   icon={<BookOpen />}
 *   accentColor="purple"
 * />
 */
const StatsCard = forwardRef<HTMLDivElement, StatsCardProps>(
  (
    {
      className,
      title,
      value,
      icon,
      trend,
      trendDirection = "neutral",
      description,
      accentColor = "purple",
      ...props
    },
    ref,
  ) => {
    // Determine trend icon
    const TrendIcon =
      trendDirection === "up"
        ? TrendingUp
        : trendDirection === "down"
          ? TrendingDown
          : Minus;

    return (
      <div
        ref={ref}
        className={cn(
          // Glass card base
          "bg-white/50 backdrop-blur-[12px]",
          "border border-white/60",
          "rounded-[20px]",
          "p-5",
          // Hover effect
          "transition-all duration-300",
          "hover:bg-white/70",
          "hover:-translate-y-0.5",
          "hover:shadow-lg",
          // Custom classes
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          {/* Left side: Title and Value */}
          <div className="flex-1">
            {/* Title */}
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>

            {/* Value */}
            <p className="text-3xl font-bold text-slate-800">{value}</p>

            {/* Trend and Description */}
            {(trend !== undefined || description) && (
              <div className="flex items-center gap-2 mt-2">
                {trend !== undefined && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      "px-2 py-0.5 rounded-full",
                      "text-xs font-medium",
                      trendClasses[trendDirection],
                    )}
                  >
                    <TrendIcon className="w-3 h-3" />
                    {Math.abs(trend)}%
                  </span>
                )}
                {description && (
                  <span className="text-xs text-slate-400">{description}</span>
                )}
              </div>
            )}
          </div>

          {/* Right side: Icon */}
          {icon && (
            <div
              className={cn(
                "w-12 h-12 rounded-xl",
                "bg-gradient-to-br",
                "flex items-center justify-center",
                accentClasses[accentColor],
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  },
);

StatsCard.displayName = "StatsCard";

export { StatsCard, type StatsCardProps, type TrendDirection };
