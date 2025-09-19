import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GridProps {
    children: ReactNode;
    variant?: 'cards' | 'cards-compact' | 'cards-dense' | 'cards-large' | 'dashboard-stats' | 'auto-fit' | 'auto-fill' | 'list';
    columns?: 1 | 2 | 3 | 4 | 5 | 6;
    gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    className?: string;
    debug?: boolean;
}

/**
 * Grid Component
 *
 * A flexible grid container that provides consistent responsive behavior
 * across the Lumina design system.
 *
 * Features:
 * - Multiple predefined variants for different use cases
 * - Responsive behavior with consistent breakpoints
 * - Flexible gap control
 * - Debug mode for development
 * - Auto-fit and auto-fill patterns
 *
 * @example
 * <Grid variant="cards" gap="lg">
 *   <Card>Content 1</Card>
 *   <Card>Content 2</Card>
 *   <Card>Content 3</Card>
 * </Grid>
 *
 * @example
 * <Grid columns={3} gap="md">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </Grid>
 */
export function Grid({
    children,
    variant,
    columns,
    gap = 'md',
    className,
    debug = false,
}: GridProps) {
    // Determine the grid class based on variant or columns
    const getGridClass = () => {
        if (variant) {
            switch (variant) {
                case 'cards':
                    return 'grid-cards';
                case 'cards-compact':
                    return 'grid-cards-compact';
                case 'cards-dense':
                    return 'grid-cards-dense';
                case 'cards-large':
                    return 'grid-cards-large';
                case 'dashboard-stats':
                    return 'grid-dashboard-stats';
                case 'auto-fit':
                    return 'grid-auto-fit';
                case 'auto-fill':
                    return 'grid-auto-fill';
                case 'list':
                    return 'grid-list';
                default:
                    return 'grid-cards';
            }
        }

        if (columns) {
            return `grid-cols-${columns}`;
        }

        return 'grid-cards'; // Default fallback
    };

    const gridClass = getGridClass();
    const gapClass = `gap-${gap}`;

    return (
        <div
            className={cn(
                'grid-container',
                gridClass,
                gapClass,
                debug && 'grid-debug',
                className
            )}
        >
            {children}
        </div>
    );
}

interface GridItemProps {
    children: ReactNode;
    colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 'full';
    rowSpan?: 1 | 2 | 3 | 4 | 'full';
    className?: string;
}

/**
 * GridItem Component
 *
 * A wrapper for grid items that provides spanning utilities.
 *
 * @example
 * <Grid variant="cards">
 *   <GridItem colSpan={2}>
 *     <Card>Wide card</Card>
 *   </GridItem>
 *   <GridItem>
 *     <Card>Normal card</Card>
 *   </GridItem>
 * </Grid>
 */
export function GridItem({
    children,
    colSpan,
    rowSpan,
    className,
}: GridItemProps) {
    const spanClasses = cn(
        colSpan && (colSpan === 'full' ? 'col-span-full' : `col-span-${colSpan}`),
        rowSpan && (rowSpan === 'full' ? 'row-span-full' : `row-span-${rowSpan}`),
        className
    );

    return (
        <div className={spanClasses}>
            {children}
        </div>
    );
}

// Export both components
export { Grid as default, GridItem };
