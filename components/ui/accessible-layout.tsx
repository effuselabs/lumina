import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { MainContentWrapper, NavigationWrapper, SkipLinks } from './skip-links';

interface AccessibleLayoutProps {
  children: ReactNode;
  navigation?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  className?: string;
  skipLinks?: Array<{
    href: string;
    label: string;
  }>;
  enableThemeProvider?: boolean;
  defaultTheme?: 'light' | 'dark' | 'system';
  themeStorageKey?: string;
}

/**
 * AccessibleLayout Component
 *
 * Provides a semantic, accessible layout structure with:
 * - Skip navigation links
 * - Proper landmark regions
 * - Semantic HTML structure
 * - Screen reader optimizations
 * - Optional theme provider integration
 *
 * @example
 * <AccessibleLayout
 *   navigation={<DashboardNav />}
 *   header={<DashboardHeader />}
 *   sidebar={<DashboardSidebar />}
 *   skipLinks={[
 *     { href: '#main-content', label: 'Skip to main content' },
 *     { href: '#navigation', label: 'Skip to navigation' },
 *     { href: '#sidebar', label: 'Skip to sidebar' }
 *   ]}
 *   enableThemeProvider={true}
 *   defaultTheme="system"
 * >
 *   <PageContent />
 * </AccessibleLayout>
 */
export function AccessibleLayout({
  children,
  navigation,
  header,
  footer,
  sidebar,
  className,
  skipLinks,
  enableThemeProvider = true,
  defaultTheme = 'system',
  themeStorageKey = 'lumina-theme',
}: AccessibleLayoutProps) {
  const layoutContent = (
    <div className={cn('accessible-layout', className)}>
      {/* Skip Links */}
      <SkipLinks links={skipLinks} />

      {/* Page Header */}
      {header && (
        <header className="accessible-layout__header" role="banner">
          {header}
        </header>
      )}

      <div className="accessible-layout__body">
        {/* Navigation */}
        {navigation && (
          <NavigationWrapper
            className="accessible-layout__navigation"
            ariaLabel="Main navigation"
          >
            {navigation}
          </NavigationWrapper>
        )}

        {/* Sidebar */}
        {sidebar && (
          <aside
            id="sidebar"
            className="accessible-layout__sidebar"
            role="complementary"
            aria-label="Sidebar"
            tabIndex={-1}
          >
            {sidebar}
          </aside>
        )}

        {/* Main Content */}
        <MainContentWrapper className="accessible-layout__main">
          {children}
        </MainContentWrapper>
      </div>

      {/* Footer */}
      {footer && (
        <footer className="accessible-layout__footer" role="contentinfo">
          {footer}
        </footer>
      )}
    </div>
  );

  // Conditionally wrap with ThemeProvider
  if (enableThemeProvider) {
    return (
      <ThemeProvider defaultTheme={defaultTheme} storageKey={themeStorageKey}>
        {layoutContent}
      </ThemeProvider>
    );
  }

  return layoutContent;
}

/**
 * PageSection Component
 *
 * Creates semantic sections within pages with proper headings.
 */
interface PageSectionProps {
  children: ReactNode;
  title?: string;
  level?: 2 | 3 | 4 | 5 | 6;
  className?: string;
  id?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

export function PageSection({
  children,
  title,
  level = 2,
  className,
  id,
  ariaLabel,
  ariaLabelledBy,
}: PageSectionProps) {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
  const sectionId =
    id || (title ? title.toLowerCase().replace(/\s+/g, '-') : undefined);
  const headingId = title ? `${sectionId}-heading` : undefined;

  return (
    <section
      id={sectionId}
      className={cn('page-section', className)}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy || headingId}
    >
      {title && (
        <HeadingTag id={headingId} className="page-section__heading">
          {title}
        </HeadingTag>
      )}
      <div className="page-section__content">{children}</div>
    </section>
  );
}

/**
 * AccessibleTable Component
 *
 * Creates accessible data tables with proper headers and descriptions.
 */
interface AccessibleTableProps {
  children: ReactNode;
  caption?: string;
  summary?: string;
  className?: string;
  headers?: string[];
}

export function AccessibleTable({
  children,
  caption,
  summary,
  className,
  headers,
}: AccessibleTableProps) {
  return (
    <div className="accessible-table-wrapper">
      {summary && (
        <p className="accessible-table__summary sr-only">{summary}</p>
      )}
      <table
        className={cn('accessible-table', className)}
        role="table"
        aria-describedby={summary ? 'table-summary' : undefined}
      >
        {caption && (
          <caption className="accessible-table__caption">{caption}</caption>
        )}
        {headers && (
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  id={`header-${index}`}
                  className="accessible-table__header"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/**
 * AccessibleList Component
 *
 * Creates semantic lists with proper structure and descriptions.
 */
interface AccessibleListProps {
  children: ReactNode;
  type?: 'ordered' | 'unordered' | 'description';
  className?: string;
  ariaLabel?: string;
  role?: string;
}

export function AccessibleList({
  children,
  type = 'unordered',
  className,
  ariaLabel,
  role,
}: AccessibleListProps) {
  if (type === 'description') {
    return (
      <dl
        className={cn(
          'accessible-list accessible-list--description',
          className
        )}
        aria-label={ariaLabel}
        role={role}
      >
        {children}
      </dl>
    );
  }

  const ListTag = type === 'ordered' ? 'ol' : 'ul';

  return (
    <ListTag
      className={cn('accessible-list', `accessible-list--${type}`, className)}
      aria-label={ariaLabel}
      role={role || 'list'}
    >
      {children}
    </ListTag>
  );
}

/**
 * AccessibleListItem Component
 */
interface AccessibleListItemProps {
  children: ReactNode;
  className?: string;
  value?: string | number;
  term?: string; // For description lists
}

export function AccessibleListItem({
  children,
  className,
  value,
  term,
}: AccessibleListItemProps) {
  if (term) {
    return (
      <>
        <dt className={cn('accessible-list__term', className)}>{term}</dt>
        <dd className="accessible-list__description">{children}</dd>
      </>
    );
  }

  return (
    <li
      className={cn('accessible-list__item', className)}
      value={value}
      role="listitem"
    >
      {children}
    </li>
  );
}

/**
 * VisuallyHidden Component
 *
 * Hides content visually but keeps it available to screen readers.
 */
interface VisuallyHiddenProps {
  children: ReactNode;
  focusable?: boolean;
}

export function VisuallyHidden({
  children,
  focusable = false,
}: VisuallyHiddenProps) {
  return (
    <span className={focusable ? 'sr-only-focusable' : 'sr-only'}>
      {children}
    </span>
  );
}

/**
 * StatusMessage Component
 *
 * Creates accessible status messages with proper live region announcements.
 */
interface StatusMessageProps {
  children: ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
  priority?: 'polite' | 'assertive';
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function StatusMessage({
  children,
  type = 'info',
  priority = 'polite',
  className,
  dismissible = false,
  onDismiss,
}: StatusMessageProps) {
  const roleMap = {
    info: 'status',
    success: 'status',
    warning: 'alert',
    error: 'alert',
  };

  return (
    <div
      className={cn('status-message', `status-message--${type}`, className)}
      role={roleMap[type]}
      aria-live={priority}
      aria-atomic="true"
    >
      <div className="status-message__content">
        <VisuallyHidden>
          {type === 'error'
            ? 'Error: '
            : type === 'warning'
              ? 'Warning: '
              : type === 'success'
                ? 'Success: '
                : 'Information: '}
        </VisuallyHidden>
        {children}
      </div>

      {dismissible && (
        <button
          type="button"
          className="status-message__dismiss"
          onClick={onDismiss}
          aria-label={`Dismiss ${type} message`}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}
