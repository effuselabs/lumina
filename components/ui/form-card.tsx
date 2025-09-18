import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface FormCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

/**
 * FormCard Component
 *
 * Standardized form containers with consistent styling and layout.
 * Provides professional form presentation with optional header and footer sections.
 *
 * @example
 * <FormCard
 *   title="Business Information"
 *   description="Update your business profile and contact details"
 *   footer={<Button type="submit">Save Changes</Button>}
 * >
 *   <form>
 *     Form fields
 *   </form>
 * </FormCard>
 */
export function FormCard({
  title,
  description,
  children,
  className,
  footer,
}: FormCardProps) {
  return (
    <Card className={cn('', className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle className="lumina-heading-3">{title}</CardTitle>}
          {description && (
            <CardDescription
              className="lumina-body-small"
              style={{ color: '#808285' }}
            >
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}

      <CardContent className="space-y-6">{children}</CardContent>

      {footer && (
        <CardContent className="border-t pt-0">
          <div className="flex justify-end space-x-3 pt-6">{footer}</div>
        </CardContent>
      )}
    </Card>
  );
}
