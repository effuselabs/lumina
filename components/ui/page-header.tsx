import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronRight, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: Array<{
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
    variant?:
      'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
    primary?: boolean;
    disabled?: boolean;
  }>;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  variant?: 'default' | 'compact';
  className?: string;
  children?: ReactNode;
}

/**
 * PageHeader Component
 *
 * Provides consistent page titles with optional actions, descriptions, and breadcrumbs.
 * Follows Lumina design system typography and spacing standards with responsive behavior.
 *
 * Features:
 * - Dashboard typography hierarchy and spacing patterns
 * - Responsive behavior for mobile and tablet viewports
 * - Compact variant for pages with limited vertical space
 * - Consistent breadcrumb navigation
 * - Flexible action buttons with proper styling
 *
 * @example
 * <PageHeader
 *   title="Staff Management"
 *   subtitle="Team Overview"
 *   description="Manage your team members and employment configurations"
 *   variant="default"
 *   actions={[
 *     { label: 'Add Staff', onClick: handleAdd, icon: Plus, primary: true },
 *     { label: 'Import', onClick: handleImport, icon: Upload, variant: 'outline' }
 *   ]}
 *   breadcrumbs={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Staff' }
 *   ]}
 * />
 */
export function PageHeader({
  title,
  subtitle,
  description,
  actions,
  breadcrumbs,
  variant = 'default',
  className,
  children,
}: PageHeaderProps) {
  const isCompact = variant === 'compact';

  return (
    <div className={cn(isCompact ? 'space-y-2' : 'space-y-4', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="text-sm" aria-label="Breadcrumb navigation">
          <ol className="flex items-center">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <ChevronRight
                    className="text-color-foreground-muted mx-2 h-4 w-4"
                    aria-hidden="true"
                  />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-ink-soft hover:text-ink-strong transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-ink-strong font-medium">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header Content */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div>
            <h1
              className={cn(
                'text-ink-strong font-semibold',
                isCompact ? 'text-xl' : 'text-2xl'
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-ink-soft text-sm font-medium">{subtitle}</p>
            )}
          </div>
          {description && (
            <p className="text-ink-soft mt-1 text-base">{description}</p>
          )}
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Page actions"
          >
            {actions.map((action, index) => {
              const Icon = action.icon;
              const buttonProps = {
                variant: action.primary
                  ? 'primary'
                  : action.variant || 'outline',
                onClick: action.onClick,
                disabled: action.disabled,
                className: 'touch-target',
                'aria-label': action.label,
                'aria-describedby': action.primary
                  ? `${action.label.toLowerCase().replace(/\s+/g, '-')}-primary-action`
                  : undefined,
              };

              const content = (
                <>
                  {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                  <span>{action.label}</span>
                  {action.primary && (
                    <span
                      id={`${action.label.toLowerCase().replace(/\s+/g, '-')}-primary-action`}
                      className="sr-only"
                    >
                      Primary action
                    </span>
                  )}
                </>
              );

              return action.href ? (
                <Button key={index} asChild {...buttonProps}>
                  <Link href={action.href}>{content}</Link>
                </Button>
              ) : (
                <Button key={index} {...buttonProps}>
                  {content}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Additional Content */}
      {children && <div>{children}</div>}
    </div>
  );
}
