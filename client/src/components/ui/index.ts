/**
 * ============================================================
 * UI COMPONENTS INDEX
 * ============================================================
 *
 * Central export file for all UI components.
 * Import components from here for cleaner imports.
 *
 * @example
 * import { Button, Input, GlassCard, Badge } from '@/components/ui';
 *
 * ============================================================
 */

// Core Components
export {
  Button,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from "./Button";
export { Input, type InputProps } from "./Input";
export {
  Badge,
  type BadgeProps,
  type BadgeVariant,
  type BadgeSize,
} from "./Badge";

// Glass Components
export {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
  GlassCardFooter,
  type GlassCardProps,
  type GlassVariant,
} from "./GlassCard";

// Dashboard Components
export {
  StatsCard,
  type StatsCardProps,
  type TrendDirection,
} from "./StatsCard";
