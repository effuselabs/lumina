# Lumina Design System - Design Tokens

Version 2.1 - Comprehensive design token system for consistent styling across the Lumina application.

## Overview

The Lumina design token system provides a centralized foundation for all visual design decisions. It includes tokens for colors, typography, spacing, shadows, border radius, and animations, all designed to work seamlessly in both light and dark themes.

## Token Categories

### 1. Colors (`colors.css`)

#### Brand Colors

- `--lumina-gold`: #ffd25a (Primary brand color)
- `--lumina-coral`: #ff7a5a (Secondary brand color)
- `--deep-teal`: #0b2b33 (Accent color)
- `--clarity-blue`: #89cff0 (Tertiary color)
- `--lumina-peach`: #ffe5b4 (Soft accent)

#### Neutral Scale

- `--neutral-50` to `--neutral-950`: Complete grayscale from lightest to darkest
- `--neutral-white` and `--neutral-black`: Pure white and black

#### Semantic Colors

- `--color-primary`: Primary interactive color
- `--color-secondary`: Secondary interactive color
- `--color-success`: Success state color
- `--color-warning`: Warning state color
- `--color-error`: Error state color
- `--color-info`: Information state color

#### Surface Colors

- `--color-background`: Main background color
- `--color-surface`: Card and component background
- `--color-foreground`: Primary text color
- `--color-border`: Border color

### 2. Typography (`typography.css`)

#### Font Families

- `--font-family-sans`: Inter font stack for UI text
- `--font-family-mono`: Monospace font stack for code

#### Font Sizes

- `--font-size-xs` (12px) to `--font-size-9xl` (128px)
- Based on 1.125 ratio (major second) for harmonious scaling

#### Typography Hierarchy

- `--typography-display-*`: Hero and major headings
- `--typography-heading-*`: Section headings
- `--typography-body-*`: Content text
- `--typography-label-*`: Form labels and UI text
- `--typography-caption-*`: Secondary information

### 3. Spacing (`spacing.css`)

#### Base Scale

- `--spacing-0` (0px) to `--spacing-96` (384px)
- Based on 0.25rem (4px) increments

#### Semantic Spacing

- `--padding-component-*`: Component padding tokens
- `--margin-component-*`: Component margin tokens
- `--gap-*`: Flexbox and grid gap tokens

#### Layout Spacing

- `--dashboard-*`: Dashboard-specific spacing
- `--card-*`: Card component spacing
- `--form-*`: Form component spacing
- `--button-*`: Button component spacing

### 4. Effects (`effects.css`)

#### Shadows

- `--shadow-xs` to `--shadow-2xl`: Standard elevation shadows
- `--shadow-lumina-*`: Brand-colored shadows
- `--shadow-glow-*`: Glow effects for interactive elements
- `--shadow-focus`: Accessibility focus indicators

#### Border Radius

- `--radius-xs` (2px) to `--radius-3xl` (24px)
- `--radius-full`: Fully rounded elements
- Component-specific radius tokens

#### Animations

- `--duration-*`: Animation duration tokens
- `--easing-*`: Easing curve tokens
- `--transition-*`: Pre-configured transitions

## Usage

### Direct Token Usage

```css
.my-component {
  background-color: var(--color-surface);
  color: var(--color-foreground);
  padding: var(--padding-component-md);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-card);
}
```

### Utility Classes

```html
<div
  class="bg-surface p-component-md rounded-card transition-card text-foreground shadow-sm"
>
  Content here
</div>
```

### Component Presets

```html
<button class="btn-lumina-primary">Primary Button</button>
<div class="card-lumina">Card Content</div>
<input class="input-lumina" type="text" placeholder="Input field" />
```

## Theme Support

The design token system fully supports light and dark themes:

### Light Theme (Default)

All tokens are optimized for light backgrounds with appropriate contrast ratios.

### Dark Theme

Activated with `[data-theme='dark']` attribute on the root element:

```html
<html data-theme="dark"></html>
```

Dark theme automatically adjusts:

- Background colors to darker variants
- Text colors for proper contrast
- Shadows for better visibility on dark backgrounds
- Interactive states for dark theme aesthetics

## Accessibility Features

### WCAG Compliance

- All color combinations meet WCAG 2.1 AA contrast requirements
- Focus indicators are clearly visible and meet contrast standards
- Color is never the only means of conveying information

### Reduced Motion Support

- Respects `prefers-reduced-motion` user preference
- Reduces animation durations and uses linear easing when requested
- Maintains functionality while reducing motion

### High Contrast Support

- Enhanced shadows and borders for `prefers-contrast: high`
- Stronger focus indicators for better visibility
- Improved definition between elements

## Responsive Design

### Breakpoint Adjustments

- Typography scales down appropriately on smaller screens
- Spacing reduces on mobile devices for better space utilization
- Component sizing adapts to viewport constraints

### Container Queries

- Tokens support container-based responsive design
- Components adapt to their container size, not just viewport

## Best Practices

### Token Selection

1. Always use semantic tokens (`--color-primary`) over literal tokens (`--lumina-gold`) when possible
2. Use component-specific tokens (`--card-padding-md`) for consistent component styling
3. Prefer pre-configured transitions over custom animations

### Customization

1. Extend tokens by creating new semantic mappings
2. Override tokens at the component level for specific needs
3. Maintain consistency with the existing token scale

### Performance

1. Tokens are optimized for CSS custom property performance
2. Use utility classes for frequently repeated patterns
3. Leverage component presets for complex styling patterns

## File Structure

```
app/design-tokens/
├── index.css          # Main import file and utilities
├── colors.css         # Color tokens and theme definitions
├── typography.css     # Typography scale and hierarchy
├── spacing.css        # Spacing scale and layout tokens
├── effects.css        # Shadows, radius, and animation tokens
└── README.md          # This documentation file
```

## Integration

The design token system is automatically imported in `app/globals.css`:

```css
@import './design-tokens/index.css';
```

This makes all tokens available throughout the application without additional imports.

## Migration Guide

### From Existing Styles

1. Replace hardcoded values with appropriate tokens
2. Use semantic color tokens instead of brand colors directly
3. Replace custom shadows with token-based shadows
4. Update animations to use token-based durations and easing

### Example Migration

```css
/* Before */
.card {
  background: #ffffff;
  color: #1d2d35;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

/* After */
.card {
  background-color: var(--color-surface);
  color: var(--color-foreground);
  padding: var(--card-padding-md);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-md);
  transition: var(--transition-card);
}
```

## Maintenance

### Adding New Tokens

1. Add tokens to the appropriate category file
2. Update this documentation
3. Add utility classes if needed
4. Test in both light and dark themes

### Updating Existing Tokens

1. Consider backward compatibility
2. Update all affected components
3. Test across all breakpoints and themes
4. Update documentation and examples

## Support

For questions about the design token system or suggestions for improvements, please refer to the Lumina design system documentation or create an issue in the project repository.
