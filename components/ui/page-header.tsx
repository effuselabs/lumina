import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: Array<{
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
    variant?: 'default' | 'outline' | 'ghost';
    primary?: boolean;
  }>;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  className?: string;
  children?: ReactNode;
}

/**
 * PageHeader Component
 *
 * Provides consistent page titles with optional actions, descriptions, and breadcrumbs.
 * Follows Lumina design system typography and spacing standards.
 *
 * @example
 * <PageHeader
 *   title="Staff Management"
 *   description="Manage your team members and employment configurations"
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
  description,
  actions,
  breadcrumbs,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center space-x-2">
              {index > 0 && <span>/</span>}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Header Content */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="lumina-heading-2">{title}</h1>
          {description && (
            <p className="lumina-body-large" style={{ color: '#808285' }}>
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex items-center space-x-3">
            {actions.map((action, index) => {
              const Icon = action.icon;
              const buttonProps = {
                variant: action.primary
                  ? 'default'
                  : action.variant || 'outline',
                onClick: action.onClick,
                className: action.primary
                  ? 'bg-lumina-radiant hover:bg-lumina-radiant-hover text-white'
                  : undefined,
              };

              const content = (
                <>
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  {action.label}
                </>
              );

              return action.href ? (
                <Button key={index} asChild {...buttonProps}>
                  <a href={action.href}>{content}</a>
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
      {children}
    </div>
  );
}
