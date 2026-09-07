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
    <div
      className={cn(
        'page-header',
        isCompact ? 'page-header--compact' : 'page-header--default',
        className
      )}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className="page-header__breadcrumbs"
          aria-label="Breadcrumb navigation"
        >
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
                    className="page-header__breadcrumb-link"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="page-header__breadcrumb-current">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header Content */}
      <div className="page-header__content">
        <div className="page-header__text">
          <div className="page-header__title-group">
            <h1 className="page-header__title">{title}</h1>
            {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
          </div>
          {description && (
            <p className="page-header__description">{description}</p>
          )}
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div
            className="page-header__actions"
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
                className: cn(
                  'page-header__action-button touch-target',
                  action.primary && 'page-header__action-button--primary'
                ),
                'aria-label': action.label,
                'aria-describedby': action.primary
                  ? `${action.label.toLowerCase().replace(/\s+/g, '-')}-primary-action`
                  : undefined,
              };

              const content = (
                <>
                  {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                  <span className="page-header__action-label">
                    {action.label}
                  </span>
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
      {children && <div className="page-header__children">{children}</div>}
    </div>
  );
}
