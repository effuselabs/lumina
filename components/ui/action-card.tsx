import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
}

/**
 * ActionCard Component
 *
 * Consistent action button layouts with card-based presentation.
 * Supports both click handlers and navigation links with professional styling.
 *
 * @example
 * <ActionCard
 *   title="Process Payment"
 *   description="Handle customer transactions"
 *   icon={CreditCard}
 *   onClick={handlePayment}
 *   variant="primary"
 * />
 */
export function ActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  href,
  variant = 'default',
  className,
  disabled = false,
}: ActionCardProps) {
  const baseClasses = cn(
    'cursor-pointer transition-all duration-200 hover:shadow-md',
    {
      'hover:border-lumina-gold': variant === 'primary' && !disabled,
      'hover:border-deep-teal': variant === 'secondary' && !disabled,
      'opacity-50 cursor-not-allowed': disabled,
    },
    className
  );

  const iconClasses = cn('h-6 w-6', {
    'text-lumina-coral': variant === 'primary',
    'text-deep-teal': variant === 'secondary',
    'text-muted-foreground': variant === 'default',
  });

  const content = (
    <Card className={baseClasses}>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div
              className={cn('rounded-lg p-2', {
                'bg-orange-100': variant === 'primary',
                'bg-teal-100': variant === 'secondary',
                'bg-gray-100': variant === 'default',
              })}
            >
              <Icon className={iconClasses} />
            </div>
          )}
          <div>
            <CardTitle className="lumina-heading-3">{title}</CardTitle>
            {description && (
              <CardDescription
                className="lumina-body-small"
                style={{ color: '#808285' }}
              >
                {description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  if (disabled) {
    return content;
  }

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {content}
    </div>
  );
}
