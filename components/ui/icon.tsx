import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import {
  // Common icons for Lumina (alphabetically sorted)
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  Download,
  Edit,
  Eye,
  EyeOff,
  Filter,
  Heart,
  Home,
  Info,
  Mail,
  MapPin,
  Menu,
  Minus,
  Palette,
  Phone,
  Plus,
  Scissors,
  Search,
  Settings,
  Star,
  Trash2,
  Upload,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import * as React from 'react';

const iconVariants = cva('', {
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
      xl: 'h-8 w-8',
      '2xl': 'h-10 w-10',
    },
    color: {
      default: 'text-current',
      primary: 'text-lumina-gold',
      secondary: 'text-deep-teal',
      muted: 'text-neutral-medium-grey',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'default',
  },
});

export interface IconProps
  extends Omit<React.HTMLAttributes<SVGElement>, 'color'>,
    VariantProps<typeof iconVariants> {
  icon: LucideIcon;
}

const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, size, color, icon: IconComponent, ...props }, ref) => {
    return (
      <IconComponent
        ref={ref}
        className={cn(iconVariants({ size, color }), className)}
        {...props}
      />
    );
  }
);
Icon.displayName = 'Icon';

// Pre-configured icon components for common use cases
export const Icons = {
  // Navigation
  home: Home,
  dashboard: BarChart3,
  calendar: Calendar,
  users: Users,
  settings: Settings,

  // Business
  scissors: Scissors,
  palette: Palette,
  creditCard: CreditCard,

  // User actions
  user: User,
  phone: Phone,
  mail: Mail,
  mapPin: MapPin,

  // Status
  star: Star,
  heart: Heart,
  checkCircle: CheckCircle,
  alertCircle: AlertCircle,
  xCircle: XCircle,
  info: Info,

  // Actions
  plus: Plus,
  minus: Minus,
  edit: Edit,
  trash: Trash2,
  search: Search,
  filter: Filter,
  download: Download,
  upload: Upload,

  // UI
  eye: Eye,
  eyeOff: EyeOff,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  menu: Menu,
  x: X,
  bell: Bell,
  clock: Clock,
} as const;

export { Icon, iconVariants, type LucideIcon };
