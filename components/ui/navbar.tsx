import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Icons } from './icon';
import { Container } from './layout';

interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  children?: React.ReactNode;
}

const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ className, logo, children, ...props }, ref) => (
    <nav
      ref={ref}
      className={cn(
        'sticky top-0 z-50 w-full border-b border-neutral-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60',
        className
      )}
      {...props}
    >
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            {logo || (
              <Link href="/" className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lumina-radiant">
                  <span className="text-sm font-bold text-white">L</span>
                </div>
                <span className="text-xl font-bold text-neutral-off-black">
                  Lumina
                </span>
              </Link>
            )}
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-4">{children}</div>
        </div>
      </Container>
    </nav>
  )
);
Navbar.displayName = 'Navbar';

// Mobile-responsive sidebar navigation
interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, isOpen = false, onClose, children, ...props }, ref) => (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={ref}
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 transform border-r border-neutral-border bg-white transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
        {...props}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-border px-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lumina-radiant">
              <span className="text-sm font-bold text-white">L</span>
            </div>
            <span className="text-xl font-bold text-neutral-off-black">
              Lumina
            </span>
          </Link>

          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden"
          >
            <Icons.x className="h-5 w-5" />
          </Button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  )
);
Sidebar.displayName = 'Sidebar';

// Navigation item for sidebar
interface NavItemProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
  children: React.ReactNode;
}

const NavItem = React.forwardRef<HTMLAnchorElement, NavItemProps>(
  ({ className, href, icon, active = false, children, ...props }, ref) => (
    <Link
      ref={ref}
      href={href}
      className={cn(
        'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-lumina-gold/10 text-lumina-gold'
          : 'text-neutral-off-black hover:bg-neutral-light-grey hover:text-lumina-gold',
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </Link>
  )
);
NavItem.displayName = 'NavItem';

// Breadcrumb navigation
const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    aria-label="breadcrumb"
    className={cn('flex', className)}
    {...props}
  />
));
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.HTMLAttributes<HTMLOListElement>
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      'flex flex-wrap items-center gap-1.5 break-words text-sm text-neutral-medium-grey sm:gap-2.5',
      className
    )}
    {...props}
  />
));
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn('inline-flex items-center gap-1.5', className)}
    {...props}
  />
));
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.HTMLAttributes<HTMLAnchorElement> & {
    href: string;
  }
>(({ className, href, ...props }, ref) => (
  <Link
    ref={ref}
    href={href}
    className={cn('transition-colors hover:text-lumina-gold', className)}
    {...props}
  />
));
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<'li'>) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn('[&>svg]:size-3.5', className)}
    {...props}
  >
    {children ?? <Icons.chevronRight />}
  </li>
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

export {
  Navbar,
  Sidebar,
  NavItem,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
};
