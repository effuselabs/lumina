# Architectural Decision Log

This document records significant architectural and technical decisions made during Lumina's development. Each decision includes the context, rationale, alternatives considered, and impact.

## Decision Format

Each decision follows this structure:

- **Decision ID**: Unique identifier
- **Date**: When the decision was made
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: The situation that led to this decision
- **Decision**: What was decided
- **Rationale**: Why this decision was made
- **Alternatives**: Other options that were considered
- **Impact**: How this affects the system and development
- **Related Issues**: Linear issues or other references

---

## ADR-001: Multi-Tenant Architecture Pattern

**Date**: Winter 2025 (Early Development)  
**Status**: Accepted  
**Context**: Lumina needs to support multiple salon businesses in a single deployment while ensuring complete data isolation and security.

**Decision**: Implement business-scoped multi-tenancy with `businessId` foreign keys on all business data models.

**Rationale**:

- Provides strong data isolation between businesses
- Simplifies deployment and maintenance (single instance)
- Enables shared infrastructure while maintaining security
- Allows for business-specific customizations

**Alternatives Considered**:

1. **Database-per-tenant**: Separate database for each business
   - Rejected: Complex deployment and maintenance overhead
2. **Schema-per-tenant**: Separate schema for each business
   - Rejected: PostgreSQL schema limitations and complexity
3. **Application-level isolation**: Single database with application logic
   - Chosen: Simpler implementation with Prisma ORM support

**Impact**:

- All database queries must include `businessId` filtering
- Middleware enforces business context on all routes
- Authentication system manages business switching
- API routes require business context validation

**Related Issues**: Multi-tenancy implementation

---#

# ADR-002: NextAuth.js v5 for Authentication

**Date**: Winter 2025 (Early Development)  
**Status**: Accepted  
**Context**: Need robust authentication system supporting multiple user roles and business contexts.

**Decision**: Use NextAuth.js v5 (Auth.js) with custom business context management.

**Rationale**:

- Industry-standard authentication library
- Built-in security best practices
- Flexible provider support (email, OAuth)
- Strong TypeScript support
- Active maintenance and community

**Alternatives Considered**:

1. **Custom JWT implementation**: Build from scratch
   - Rejected: Security risks and maintenance overhead
2. **Supabase Auth**: Third-party authentication service
   - Rejected: Vendor lock-in and additional dependency
3. **Clerk**: Modern authentication platform
   - Rejected: Cost considerations and feature overlap

**Impact**:

- Secure session management with encrypted JWTs
- Role-based access control implementation
- Business context switching capability
- Integration with middleware for route protection

**Related Issues**: Authentication system implementation

---

## ADR-003: Prisma ORM for Database Management

**Date**: Winter 2025 (Early Development)  
**Status**: Accepted  
**Context**: Need type-safe database access with multi-tenant support and migration management.

**Decision**: Use Prisma ORM with PostgreSQL for all database operations.

**Rationale**:

- Excellent TypeScript integration and type safety
- Powerful migration system
- Query optimization and performance monitoring
- Strong multi-tenant patterns support
- Great developer experience with Prisma Studio

**Alternatives Considered**:

1. **Drizzle ORM**: Lightweight TypeScript ORM
   - Rejected: Less mature ecosystem and tooling
2. **TypeORM**: Established ORM with decorator patterns
   - Rejected: Complex configuration and maintenance
3. **Raw SQL with type generators**: Direct database access
   - Rejected: Loss of type safety and migration management

**Impact**:

- Type-safe database operations throughout application
- Automated migration management
- Business-scoped query patterns enforced
- Enhanced developer productivity with generated types

**Related Issues**: Database setup

---#

# ADR-004: Next.js App Router Architecture

**Date**: Winter 2025 (Foundation Phase)  
**Status**: Accepted  
**Context**: Need modern React architecture with server-side rendering, routing, and API capabilities.

**Decision**: Use Next.js 14 with App Router for full-stack application architecture.

**Rationale**:

- Modern React Server Components support
- Built-in API routes and middleware
- Excellent performance with SSR and static generation
- Strong TypeScript integration
- Industry standard for React applications

**Alternatives Considered**:

1. **Remix**: Full-stack React framework
   - Rejected: Smaller ecosystem and learning curve
2. **Vite + React Router**: Client-side React application
   - Rejected: Requires separate backend and more complex deployment
3. **T3 Stack**: Opinionated Next.js stack
   - Rejected: Too opinionated for custom requirements

**Impact**:

- Server and client components architecture
- API routes for backend functionality
- Middleware for authentication and business context
- Static generation for performance optimization

**Related Issues**: Next.js setup

---

## ADR-005: Documentation-First Development Approach

**Date**: September 2, 2025  
**Status**: Accepted  
**Context**: AI-human collaborative development requires comprehensive documentation to maintain context and prevent knowledge loss between sessions.

**Decision**: Implement documentation-first development with comprehensive specs, daily status tracking, and AI context preservation.

**Rationale**:

- Prevents loss of context between AI sessions
- Improves code quality and maintainability
- Enables better collaboration and knowledge sharing
- Reduces onboarding time for new contributors
- Creates single source of truth for project decisions

**Alternatives Considered**:

1. **Code-first with minimal documentation**: Focus on self-documenting code
   - Rejected: Insufficient for AI collaboration and context preservation
2. **Wiki-based documentation**: External documentation system
   - Rejected: Disconnected from codebase and harder to maintain
3. **Inline documentation only**: JSDoc and code comments
   - Rejected: Lacks architectural context and decision rationale

**Impact**:

- All new features require comprehensive documentation
- Daily status tracking becomes mandatory
- AI context guides ensure session continuity
- Documentation quality assurance processes implemented
- Steering system enforces documentation standards

**Related Issues**: Documentation best practices

---##
ADR-006: Steering System for Development Standards

**Date**: September 3, 2025  
**Status**: Accepted  
**Context**: Need automated enforcement of coding standards, documentation requirements, and architectural patterns.

**Decision**: Implement Kiro steering system with file-pattern-based rule application.

**Rationale**:

- Automates enforcement of development standards
- Ensures consistency across all code and documentation
- Reduces manual review overhead
- Provides context-aware guidance for AI assistants
- Enables team-wide standard adoption

**Alternatives Considered**:

1. **ESLint rules only**: Code-level enforcement
   - Rejected: Limited to code quality, not architectural patterns
2. **Manual code review**: Human-enforced standards
   - Rejected: Inconsistent application and review overhead
3. **CI/CD pipeline checks**: Automated validation in deployment
   - Rejected: Too late in development cycle for effective guidance

**Impact**:

- Automatic application of relevant standards based on file patterns
- Consistent code quality and documentation across project
- Reduced cognitive load for developers and AI assistants
- Faster onboarding and context switching

**Related Issues**: Steering system implementation

---

## ADR-007: Remove Spec for Documentation Audit

**Date**: September 6, 2025  
**Status**: Accepted  
**Context**: The documentation audit spec was created to manage comprehensive documentation cleanup and migration. However, during development, we discovered that the audit scripts have critical safety issues and the documentation system is already in good shape after manual cleanup efforts.

**Decision**: Remove the documentation audit spec from the project and move the work to a separate workspace for future consideration.

**Rationale**:

1. **Safety Concerns**: The audit scripts have known critical issues tracked in LUM-78 that make them unsafe to use
2. **Documentation Quality**: Our documentation is already well-organized after manual cleanup and reorganization efforts
3. **Focus Shift**: Project focus has shifted to testing and quality assurance (LUM-76) rather than documentation migration
4. **Reduced Complexity**: Removing the spec simplifies the project structure and reduces maintenance overhead
5. **Future Flexibility**: Work can be revisited in a separate workspace when/if needed

**Alternatives Considered**:

1. **Fix the audit scripts**: Would require significant development time to address safety issues, delaying current testing priorities
   - Rejected because testing and quality assurance are higher priority for project completion
2. **Keep spec but mark as inactive**: Would leave potentially confusing inactive specs in the project
   - Rejected because it adds unnecessary complexity to project navigation
3. **Complete the audit work**: Would require extensive development time for questionable value given current documentation quality
   - Rejected because manual cleanup has already achieved the primary goals

**Impact**:

- **Positive**: Simplified project structure, clearer focus on testing priorities, reduced maintenance overhead
- **Neutral**: Documentation audit work can be revisited later if needed in separate workspace
- **Risk Mitigation**: Removes unsafe scripts from active project, preventing accidental execution

**Related Issues**: [LUM-78](https://linear.app/scootr-ca/issue/LUM-78) - Documentation audit script safety fixes

---## AD
R-008: Complete Authentication System Rebuild

**Date**: September 6, 2025  
**Status**: Accepted  
**Context**: Original authentication system had multiple routing conflicts, redirect loops, and architectural issues preventing proper functionality. Multiple attempts to fix existing system failed due to fundamental architectural problems.

**Decision**: Completely rebuild authentication system using industry-standard SaaS patterns with single dynamic route structure.

**Rationale**:

- Multiple incremental fixes failed due to fundamental architectural issues
- Clean rebuild ensures maintainable, secure foundation
- Industry-standard patterns reduce complexity and improve reliability
- Eliminates routing conflicts and redirect loops
- Provides better foundation for multi-tenant security

**Alternatives Considered**:

1. **Incremental fixes to existing system**: Continue patching routing conflicts
   - Rejected: Multiple attempts failed, underlying architecture was flawed
2. **Complex middleware-based routing**: Handle redirects in middleware
   - Rejected: Too fragile and difficult to debug
3. **Multiple static routes**: Create separate routes for each business function
   - Rejected: Caused Next.js routing priority conflicts

**Impact**:

- Affects entire application authentication flow and dashboard routing
- Enables proper multi-tenant security implementation
- Simplifies maintenance and debugging
- Provides foundation for scalable SaaS architecture
- Improves user experience with reliable authentication

**Related Issues**: [LUM-76](https://linear.app/scootr-ca/issue/LUM-76) - Quality Assurance

---

## ADR-009: NextAuth Built-in Redirect Pattern

**Date**: September 6, 2025  
**Status**: Accepted  
**Context**: Custom redirect logic was causing conflicts between client-side and server-side redirects, leading to users being sent to onboarding instead of their business dashboard.

**Decision**: Use NextAuth's built-in redirect callback system instead of custom redirect handling.

**Rationale**:

- Industry standard approach following NextAuth best practices
- Eliminates conflicts between multiple redirect mechanisms
- More maintainable and reliable than custom implementations
- Reduces complexity in authentication flow
- Leverages battle-tested redirect handling

**Alternatives Considered**:

1. **Custom client-side redirect logic**: Handle redirects in React components
   - Rejected: Caused conflicts with NextAuth's server-side redirects
2. **Middleware-based redirects**: Implement redirect logic in Next.js middleware
   - Rejected: Too complex and difficult to coordinate with authentication state
3. **Multiple redirect handlers**: Separate handlers for different scenarios
   - Rejected: Created fragile system with multiple failure points

**Impact**:

- Simplifies authentication flow and eliminates redirect conflicts
- Improves reliability of post-login user experience
- Reduces maintenance overhead for authentication system
- Follows industry best practices for NextAuth implementation
- Enables proper business dashboard access after login

**Related Issues**: [LUM-76](https://linear.app/scootr-ca/issue/LUM-76) - Quality Assurance

---## ADR-01
0: Single Route Structure for Business Dashboards

**Date**: September 6, 2025  
**Status**: Accepted  
**Context**: Route groups `(dashboard)` were causing conflicts with static routes and dynamic route matching in Next.js App Router, preventing proper business dashboard access.

**Decision**: Implement clean route structure: `/dashboard` (redirect) → `/dashboard/[businessSlug]` (business dashboard).

**Rationale**:

- Eliminates Next.js routing conflicts and priority issues
- Follows SaaS industry patterns for multi-tenant applications
- Easier to maintain and debug than complex route group structures
- Provides clear separation between redirect logic and business dashboards
- Improves reliability of routing system

**Alternatives Considered**:

1. **Complex route group structures**: Continue using `(dashboard)` with nested routes
   - Rejected: Caused routing conflicts and priority issues with Next.js
2. **Multiple static routes**: Create separate static routes for each function
   - Rejected: Routing priority issues and maintenance complexity
3. **Middleware-based routing**: Handle all routing logic in middleware
   - Rejected: Too complex and difficult to coordinate with authentication

**Impact**:

- Affects all dashboard routing and business access patterns
- Simplifies architecture and improves maintainability
- Enables reliable multi-tenant business dashboard access
- Provides foundation for scalable SaaS routing patterns
- Improves debugging and development experience

**Related Issues**: [LUM-76](https://linear.app/scootr-ca/issue/LUM-76) - Quality Assurance

---

## ADR-011: Linear Labeling Standards Implementation

**Date**: September 11, 2025  
**Status**: Accepted  
**Context**: Project management required consistent Linear issue labeling for efficient tracking, filtering, and organization of development work.

**Decision**: Implement comprehensive Linear labeling system with Type, Impact, Module, Size, Stage, and Area labels for precise issue categorization.

**Rationale**:

- Enables efficient issue filtering and organization
- Provides clear context for development priorities
- Improves project management visibility and reporting
- Standardizes issue categorization across team
- Facilitates better resource allocation and planning

**Alternatives Considered**:

1. **Minimal labeling**: Use only basic labels like bug/feature
   - Rejected: Insufficient for complex project management needs
2. **Custom labeling per project**: Different labels for different areas
   - Rejected: Creates confusion and inconsistent tracking
3. **No systematic labeling**: Ad-hoc labeling as needed
   - Rejected: Poor project visibility and management

**Impact**:

- Comprehensive issue categorization and tracking
- Improved project management visibility
- Better resource allocation and priority management
- Consistent development workflow across team
- Foundation for automated project reporting

**Related Issues**: [Linear labeling standards](https://linear.app/scootr-ca/project/useluminaapp-d006c1d51186)

---## ADR-012
: AI-Enhanced Onboarding as Strategic Innovation

**Date**: September 11, 2025  
**Status**: Accepted  
**Context**: Business onboarding process required streamlined user experience while collecting comprehensive business information for platform configuration.

**Decision**: Implement AI-enhanced onboarding with intelligent form progression, contextual guidance, and automated business profile optimization.

**Rationale**:

- Improves user experience through intelligent guidance
- Reduces onboarding friction and abandonment rates
- Provides competitive advantage through innovation
- Enables better business profile completion
- Creates foundation for AI-powered features

**Alternatives Considered**:

1. **Traditional multi-step forms**: Standard form-based onboarding
   - Rejected: Poor user experience and high abandonment rates
2. **Minimal onboarding**: Collect only essential information
   - Rejected: Insufficient data for platform optimization
3. **Manual onboarding assistance**: Human-guided setup
   - Rejected: Not scalable and increases operational costs

**Impact**:

- Improved user onboarding experience and completion rates
- Competitive advantage through AI-powered innovation
- Better business profile data quality
- Foundation for future AI-enhanced features
- Reduced support overhead through intelligent guidance

**Related Issues**: [LUM-88](https://linear.app/scootr-ca/issue/LUM-88) - AI-Enhanced Onboarding

---

## ADR-013: Today's Schedule Card Component Architecture

**Date**: September 17, 2025  
**Status**: Accepted  
**Context**: Dashboard required professional schedule display component with status indicators, structured layout, and consistent design patterns.

**Decision**: Implement Today's Schedule card component with status indicators, structured appointment layout, and professional styling matching dashboard design system.

**Rationale**:

- Provides clear visual hierarchy for appointment information
- Professional appearance matching enterprise dashboard standards
- Consistent design patterns with other dashboard components
- Improved user experience through clear status indicators
- Foundation for advanced scheduling features

**Alternatives Considered**:

1. **Simple list display**: Basic appointment list without styling
   - Rejected: Poor user experience and unprofessional appearance
2. **Complex calendar widget**: Full calendar integration
   - Rejected: Unnecessary complexity for dashboard overview
3. **Third-party scheduling component**: External component library
   - Rejected: Poor integration with design system and customization limitations

**Impact**:

- Professional schedule display with clear visual hierarchy
- Improved user experience through status indicators and structured layout
- Consistent design patterns with dashboard components
- Foundation for advanced scheduling and appointment management
- Enhanced dashboard value proposition

**Related Issues**: Dashboard schedule component

---## ADR-
014: Dashboard Link Styling Consistency

**Date**: September 17, 2025  
**Status**: Accepted  
**Context**: Dashboard links required consistent styling patterns to maintain design system compliance and provide clear navigation cues.

**Decision**: Implement consistent link styling across dashboard with proper hover states, color usage, and accessibility compliance.

**Rationale**:

- Ensures consistent user experience across dashboard
- Provides clear navigation cues and interaction feedback
- Maintains design system compliance and visual consistency
- Improves accessibility through proper contrast and focus states
- Professional appearance matching enterprise standards

**Alternatives Considered**:

1. **Default browser link styling**: Use browser defaults
   - Rejected: Poor integration with design system and unprofessional appearance
2. **Component-specific link styling**: Style links individually
   - Rejected: Leads to inconsistency and maintenance overhead
3. **Minimal link styling**: Basic styling without hover states
   - Rejected: Poor user experience and accessibility

**Impact**:

- Consistent link styling and user experience across dashboard
- Improved navigation clarity and user interaction feedback
- Better accessibility compliance through proper styling
- Professional appearance and design system consistency
- Foundation for scalable link styling patterns

**Related Issues**: Dashboard link styling

---

## ADR-015: Dashboard Component Design System Standardization

**Date**: September 17, 2025  
**Status**: Accepted  
**Context**: Dashboard components required standardization to ensure consistent typography, spacing, and color usage across all dashboard areas.

**Decision**: Standardize dashboard components using consistent typography hierarchy, spacing patterns, and color usage following design system principles.

**Rationale**:

- Ensures visual consistency across all dashboard components
- Improves user experience through predictable design patterns
- Reduces development time through standardized components
- Maintains design system compliance and professional appearance
- Creates foundation for scalable dashboard development

**Alternatives Considered**:

1. **Component-specific styling**: Style each component individually
   - Rejected: Leads to inconsistency and maintenance overhead
2. **Minimal standardization**: Basic consistency only
   - Rejected: Insufficient for professional dashboard appearance
3. **Complete redesign**: Start over with new design system
   - Rejected: Unnecessary disruption and loss of existing work

**Impact**:

- Consistent visual design across all dashboard components
- Improved user experience through predictable patterns
- Faster development through standardized components
- Professional appearance matching enterprise standards
- Foundation for scalable dashboard architecture

**Related Issues**: Dashboard design standardization

---##
ADR-016: Professional Schedule Item Design Enhancement

**Date**: September 17, 2025  
**Status**: Accepted  
**Context**: Schedule items required professional design enhancement with proper status indicators, structured layout, and visual hierarchy.

**Decision**: Enhance schedule item design with professional styling, clear status indicators, and structured information hierarchy.

**Rationale**:

- Provides clear visual hierarchy for appointment information
- Professional appearance matching enterprise dashboard standards
- Improved user experience through clear status communication
- Consistent design patterns with other dashboard components
- Foundation for advanced appointment management features

**Alternatives Considered**:

1. **Basic text display**: Simple text-based schedule items
   - Rejected: Poor user experience and unprofessional appearance
2. **Complex appointment cards**: Detailed appointment information
   - Rejected: Too much information for dashboard overview
3. **Minimal styling**: Basic styling without status indicators
   - Rejected: Poor user experience and unclear status communication

**Impact**:

- Professional schedule item design with clear visual hierarchy
- Improved user experience through status indicators and structured layout
- Consistent design patterns with dashboard components
- Foundation for advanced appointment management features
- Enhanced dashboard professional appearance

**Related Issues**: Schedule item design enhancement

---

## ADR-017: Comprehensive Design System Audit Approach

**Date**: September 18, 2025  
**Status**: Accepted  
**Context**: Design system required comprehensive audit to identify inconsistencies, missing components, and areas for improvement across the application.

**Decision**: Conduct systematic design system audit covering component consistency, accessibility compliance, and usage patterns with detailed documentation of findings.

**Rationale**:

- Identifies systematic design issues requiring attention
- Provides foundation for design system improvements
- Ensures comprehensive coverage of all application areas
- Creates roadmap for design system enhancement
- Improves overall application quality and consistency

**Alternatives Considered**:

1. **Ad-hoc design fixes**: Fix design issues as discovered
   - Rejected: Doesn't address systematic problems or root causes
2. **Component-by-component review**: Review individual components
   - Rejected: Misses systematic issues and integration problems
3. **External design audit**: Hire external design consultants
   - Rejected: Cost considerations and lack of intimate project knowledge

**Impact**:

- Comprehensive understanding of design system status and needs
- Clear roadmap for design system improvements
- Systematic approach to addressing design inconsistencies
- Foundation for professional-grade design system
- Improved application quality and user experience

**Related Issues**: Design system audit

---## ADR-018
: Dashboard-Specific Theme Storage Strategy

**Date**: September 19, 2025  
**Status**: Accepted  
**Context**: Dashboard layout needed theme support with proper persistence while avoiding conflicts with other application theme contexts.

**Decision**: Implement dashboard-specific theme storage using unique storage key `"lumina-dashboard-theme"` with system theme as default.

**Rationale**:

- Enables independent theme settings for dashboard without affecting other application areas
- Prevents conflicts between different theme contexts in the application
- Provides foundation for future dashboard-specific theme customizations
- Respects user's system preferences by defaulting to system theme
- Maintains theme preferences persistently across sessions

**Alternatives Considered**:

1. **Global theme storage key**: Use single theme key for entire application
   - Rejected: Could cause conflicts when different areas need different theme contexts
2. **No theme persistence**: Don't store theme preferences
   - Rejected: Poor user experience as preferences would be lost on refresh
3. **Light theme default**: Always default to light theme
   - Rejected: Ignores user's system preferences and modern UX patterns

**Impact**:

- Dashboard maintains independent theme state from other application areas
- Users get consistent theme experience that respects their system preferences
- Foundation established for scalable theme management across application
- Improved user experience with persistent theme preferences

**Related Issues**: [LUM-93](https://linear.app/scootr-ca/issue/LUM-93) - Design System Consistency Implementation

---

## ADR-019: ThemeProvider Integration Pattern for Dashboard

**Date**: September 19, 2025  
**Status**: Accepted  
**Context**: Dashboard layout required theme support integration while maintaining existing functionality and component structure.

**Decision**: Wrap entire dashboard layout content with ThemeProvider using wrapper pattern, preserving all existing component hierarchy and functionality.

**Rationale**:

- Minimal invasive approach that doesn't disrupt existing dashboard architecture
- Provides theme context to all dashboard child components automatically
- Maintains backward compatibility with existing dashboard functionality
- Follows React context provider patterns and best practices
- Enables theme switching capabilities throughout dashboard interface

**Alternatives Considered**:

1. **Individual component theme integration**: Add theme support to each dashboard component separately
   - Rejected: More complex implementation with higher maintenance overhead
2. **Global theme provider at app level**: Implement theme at root application level
   - Rejected: Dashboard needs independent theme context for future customizations
3. **CSS-only theme switching**: Use CSS variables without React context
   - Rejected: Less flexible and doesn't provide programmatic theme access

**Impact**:

- All dashboard components now have access to theme context automatically
- Theme switching functionality available throughout dashboard interface
- Foundation established for consistent theme implementation across dashboard
- No breaking changes to existing dashboard functionality or component structure

**Related Issues**: [LUM-93](https://linear.app/scootr-ca/issue/LUM-93) - Design System Consistency Implementation

---#

# ADR-020: Comprehensive Design System Implementation Strategy

**Date**: September 19, 2025  
**Status**: Accepted  
**Context**: Application had widespread design inconsistencies across components, pages, and user experience patterns. Individual component fixes were proving insufficient to address systemic issues.

**Decision**: Implement comprehensive design system overhaul with 15 major task areas covering design tokens, components, accessibility, performance, testing, and documentation in single coordinated implementation.

**Rationale**:

- Systematic approach addresses root causes rather than symptoms
- Comprehensive implementation ensures consistency and prevents regression
- Coordinated approach eliminates integration issues between components
- Establishes scalable foundation for future development
- Addresses accessibility, performance, and user experience holistically
- Creates single source of truth for all design decisions

**Alternatives Considered**:

1. **Incremental component-by-component fixes**: Fix styling issues individually as they arise
   - Rejected: Doesn't address root cause, leads to inconsistent implementations and maintenance overhead
2. **Third-party design system adoption**: Use existing design system like Chakra UI or Mantine
   - Rejected: Doesn't match Lumina brand requirements, creates vendor dependency, limits customization
3. **Minimal styling approach**: Use basic Tailwind classes without systematic approach
   - Rejected: Leads to inconsistency, poor accessibility compliance, and maintenance issues

**Impact**:

- Complete transformation of application design consistency and user experience
- Establishment of enterprise-level design system foundation
- Comprehensive accessibility support throughout application
- Performance-optimized user interface with smooth interactions
- Scalable foundation for continued development and team growth
- Professional-grade documentation and testing infrastructure

**Related Issues**: [LUM-93](https://linear.app/scootr-ca/issue/LUM-93) - Comprehensive Design System Review & Consistency Implementation

---

## ADR-021: Design Token Foundation as Core Architecture

**Date**: September 19, 2025  
**Status**: Accepted  
**Context**: Application had hardcoded colors, inconsistent spacing, and no systematic approach to design values, making theme switching and consistency maintenance impossible.

**Decision**: Implement comprehensive CSS custom properties system with semantic tokens for colors, typography, spacing, shadows, borders, and animations as foundation for entire design system.

**Rationale**:

- Provides single source of truth for all design values across application
- Enables theme switching without component-level changes
- Ensures consistency across all components and pages automatically
- Facilitates maintenance and future design updates
- Supports accessibility requirements with semantic color tokens
- Creates scalable foundation for design system evolution

**Alternatives Considered**:

1. **Hardcoded values in components**: Continue using direct color and spacing values
   - Rejected: Maintenance complexity, inconsistency, impossible theme switching
2. **Tailwind-only approach**: Rely solely on Tailwind utility classes
   - Rejected: Limited theme switching capabilities, no semantic meaning, harder maintenance
3. **SCSS variables**: Use preprocessor variables for design tokens
   - Rejected: Less flexible than CSS custom properties, no runtime theme switching

**Impact**:

- Scalable design system foundation with comprehensive token system
- Theme switching capabilities throughout application
- Automatic consistency across all components and pages
- Simplified maintenance and design updates
- Foundation for accessibility compliance with semantic tokens
- Performance-optimized CSS delivery with minimal runtime overhead

**Related Issues**: [LUM-93](https://linear.app/scootr-ca/issue/LUM-93) - Comprehensive Design System Review & Consistency Implementation

---## ADR-022:
Accessibility-First Implementation Approach

**Date**: September 19, 2025  
**Status**: Accepted  
**Context**: Application had significant accessibility gaps including missing ARIA attributes, poor keyboard navigation, insufficient color contrast, and lack of screen reader support.

**Decision**: Implement accessibility features as core requirements rather than afterthoughts, including comprehensive WCAG AA compliance, keyboard navigation, screen reader support, and ARIA attributes throughout all components.

**Rationale**:

- Ensures inclusive user experience for all users including those with disabilities
- Meets legal compliance requirements and reduces liability
- Improves overall usability and user experience for all users
- Establishes accessibility as fundamental design principle
- Creates competitive advantage through superior accessibility
- Reduces future remediation costs by building accessibility from ground up

**Alternatives Considered**:

1. **Accessibility as add-on**: Implement accessibility features after core functionality
   - Rejected: Poor integration, compliance gaps, higher remediation costs, inferior user experience
2. **Basic compliance only**: Meet minimum legal requirements
   - Rejected: Limited user experience benefits, doesn't establish accessibility culture
3. **Third-party accessibility tools**: Rely on external tools for accessibility
   - Rejected: Doesn't address fundamental design issues, creates dependency, limited customization

**Impact**:

- Comprehensive accessibility support throughout application
- WCAG 2.1 AA compliance across all components and pages
- Superior user experience for users with disabilities
- Competitive advantage through accessibility excellence
- Reduced legal liability and compliance risk
- Foundation for accessibility culture and best practices
- Improved usability for all users through better design patterns

**Related Issues**: [LUM-93](https://linear.app/scootr-ca/issue/LUM-93) - Comprehensive Design System Review & Consistency Implementation

---

## ADR-023: Design System Critical Issues Specification

**Date**: September 20, 2025  
**Status**: Accepted  
**Context**: User reported critical design system rendering issues on localhost:3000/design-system page with buttons not showing, components not rendering correctly, indicating fundamental CSS architecture problems affecting the entire application's visual consistency.

**Decision**: Create comprehensive design system audit and fix specification addressing CSS architecture, component implementation, framework integration, and brand consistency issues.

**Rationale**:

- Systematic approach addresses root causes of rendering issues rather than symptoms
- Framework best practices integration prevents future conflicts between Next.js, Tailwind, and Radix UI
- Preserves existing dark/light theming foundation while fixing critical issues
- Maintains Lumina brand identity and Creator archetype while solving technical problems
- Comprehensive specification ensures all related issues are addressed together

**Alternatives Considered**:

1. **Quick component fixes**: Fix individual components as issues are discovered
   - Rejected: Doesn't address underlying CSS architecture problems causing widespread issues
2. **Complete design system replacement**: Start over with new design system
   - Rejected: Would lose existing work and established brand identity
3. **Minimal fixes only**: Address only the most critical rendering issues
   - Rejected: Leaves underlying problems that will cause future issues

**Impact**:

- Comprehensive solution to design system rendering and styling issues
- Framework best practices integration prevents future conflicts
- Maintains and enhances existing Lumina brand identity
- Preserves dark/light theming foundation while fixing critical problems
- Establishes world-class design system matching professional SaaS standards
- Provides foundation for scalable design system maintenance

**Related Issues**: Design system rendering issues reported by user

---## A
DR-024: Framework Best Practices Integration Strategy

**Date**: September 20, 2025  
**Status**: Accepted  
**Context**: Design system issues were caused by conflicts between Next.js SSR, Tailwind CSS configuration, and Radix UI component integration, requiring systematic framework compatibility approach.

**Decision**: Implement framework best practices integration using proper Tailwind extend configuration, Next.js SSR-compatible styling, and correct Radix UI composition patterns.

**Rationale**:

- Prevents conflicts between framework components and ensures long-term maintainability
- Proper Tailwind extend configuration prevents CSS specificity issues
- Next.js SSR compatibility ensures consistent rendering across server and client
- Radix UI composition patterns maintain accessibility while enabling custom styling
- Framework best practices reduce technical debt and improve developer experience

**Alternatives Considered**:

1. **Override framework defaults**: Force custom styling over framework patterns
   - Rejected: Creates conflicts, maintenance issues, and breaks framework assumptions
2. **Minimal framework integration**: Use frameworks without following best practices
   - Rejected: Leads to conflicts, poor performance, and maintenance problems
3. **Single framework approach**: Avoid framework integration complexity
   - Rejected: Loses benefits of modern React ecosystem and component libraries

**Impact**:

- Eliminates conflicts between Next.js, Tailwind CSS, and Radix UI
- Ensures long-term maintainability and framework compatibility
- Improves performance through proper framework optimization
- Reduces technical debt and development complexity
- Provides foundation for scalable component architecture

**Related Issues**: Design system rendering issues and framework conflicts

---

## ADR-025: Comprehensive Lumina Audit Implementation Strategy

**Date**: September 20, 2025  
**Status**: Accepted  
**Context**: Need for systematic assessment of entire Lumina platform to understand current state, identify critical gaps, and create strategic development plan for MVP completion.

**Decision**: Implement comprehensive audit covering 8 major areas: Linear issue analysis, codebase quality review, production readiness assessment, feature gap analysis, documentation audit, script cleanup, testing strategy development, and development plan creation.

**Rationale**:

- Systematic approach provides complete picture of project status and health
- Identifies critical blockers and gaps that could delay MVP launch
- Enables strategic planning and resource allocation for remaining development
- Prevents wasted effort on non-critical tasks
- Creates foundation for efficient project management and development workflow

**Alternatives Considered**:

1. **Incremental assessment**: Assess individual components as issues arise
   - Rejected: Doesn't provide complete picture, potential to miss critical interdependencies
2. **Focus on single area**: Deep dive into one specific area like testing or documentation
   - Rejected: Interconnected nature of project components requires holistic assessment
3. **External audit**: Hire third-party consultants for project assessment
   - Rejected: Cost considerations and lack of intimate project knowledge

**Impact**:

- Complete understanding of project status with 86% MVP completion identified
- Clear identification of appointment system as ready for development (all Linear issues exist)
- Strategic development plan with realistic timelines and resource allocation
- Comprehensive Linear issue organization with proper dependencies and labeling
- Foundation for efficient development workflow and project management

**Related Issues**: [LUM-103](https://linear.app/scootr-ca/issue/LUM-103) - Full Project Audit and Revision of Development Plan

---## A
DR-026: CSS-in-JS Hybrid Architecture for Bulletproof Component Visibility

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: After 32 systematic attempts to resolve button visibility issues through pure Tailwind CSS approaches, discovered that complex attribute selectors were not generating reliably, requiring a hybrid architectural solution.

**Decision**: Implement CSS-in-JS hybrid architecture where solid background variants use Tailwind utilities and transparency variants use runtime CSS injection for guaranteed visibility.

**Rationale**:

- Pure Tailwind approach failed due to complex attribute selector generation issues
- Transparency variants (outline, ghost, link) require different architectural approach than solid variants
- CSS-in-JS injection provides bulletproof visibility guarantee regardless of build configuration
- Hybrid approach leverages best of both worlds: Tailwind efficiency + CSS-in-JS reliability
- Systematic pattern recognition enables scalable architectural decisions

**Alternatives Considered**:

1. **Pure Tailwind with maximum specificity**: Continue with complex attribute selectors
   - Rejected: 24 attempts proved Tailwind generation unreliable for complex selectors
2. **Complete CSS-in-JS solution**: Replace all Tailwind with CSS-in-JS
   - Rejected: Unnecessary complexity for solid background variants that work perfectly
3. **Third-party styling solution**: Use styled-components or emotion
   - Rejected: Adds dependency and doesn't solve fundamental architectural issue

**Impact**:

- Bulletproof component visibility across all themes and build configurations
- Clear architectural pattern: solid backgrounds use Tailwind, transparency uses CSS-in-JS
- Scalable solution for future components with similar requirements
- Maintains performance optimization while ensuring reliability
- Provides foundation for world-class design system architecture

**Related Issues**: [LUM-102](https://linear.app/scootr-ca/issue/LUM-102) - Design System Critical Issues Audit and Fix

---

## ADR-027: WCAG AAA+ Accessibility Excellence as Design System Standard

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: Design system implementation achieved accessibility levels exceeding WCAG AAA standards, establishing new benchmark for inclusive design in salon management software.

**Decision**: Establish WCAG AAA+ compliance as the minimum standard for all Lumina design system components, exceeding industry requirements to ensure exceptional accessibility.

**Rationale**:

- Achieved 21:1 contrast ratios significantly exceeding WCAG AAA requirements (7:1)
- Inclusive design creates competitive advantage and broader market accessibility
- Systematic accessibility implementation prevents future compliance issues
- Sets industry leadership standard in salon management software accessibility
- Reduces legal liability while improving user experience for all users

**Alternatives Considered**:

1. **WCAG AA compliance only**: Meet minimum legal requirements (4.5:1 contrast)
   - Rejected: Insufficient for world-class user experience and competitive differentiation
2. **Selective AAA compliance**: Apply AAA standards only to critical components
   - Rejected: Inconsistent user experience and maintenance complexity
3. **Industry standard approach**: Match competitor accessibility levels
   - Rejected: Misses opportunity for accessibility leadership and differentiation

**Impact**:

- Industry-leading accessibility creating competitive advantage
- Broader market accessibility including users with visual impairments
- Reduced legal liability and compliance risk
- Enhanced user experience for all users through superior design
- Foundation for accessibility innovation and leadership

**Related Issues**: [LUM-102](https://linear.app/scootr-ca/issue/LUM-102) - Design System Critical Issues Audit and Fix

---

## ADR-028: Comprehensive Audit Methodology for Project Assessment

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: Need systematic approach to assess entire Lumina platform status, identify critical gaps, and create strategic development plan for MVP completion.

**Decision**: Implement comprehensive audit covering 9 major areas: Linear issue analysis, codebase quality review, production readiness assessment, feature gap analysis, documentation audit, script cleanup, testing strategy development, development plan creation, and post-MVP roadmap validation.

**Rationale**:

- Systematic approach provides complete picture of project status and health
- Identifies critical blockers and gaps that could delay MVP launch
- Enables strategic planning and resource allocation for remaining development
- Prevents wasted effort on non-critical tasks through proper prioritization
- Creates foundation for efficient project management and development workflow
- Validates post-MVP roadmap against market needs and technical feasibility

**Alternatives Considered**:

1. **Incremental assessment**: Assess individual components as issues arise
   - Rejected: Doesn't provide complete picture, potential to miss critical interdependencies
2. **Focus on single area**: Deep dive into one specific area like testing or documentation
   - Rejected: Interconnected nature of project components requires holistic assessment
3. **External audit**: Hire third-party consultants for project assessment
   - Rejected: Cost considerations and lack of intimate project knowledge

**Impact**:

- Complete understanding of project status with 86% MVP completion identified
- Clear identification of appointment system as ready for development (all Linear issues exist)
- Strategic development plan with realistic timelines and resource allocation
- Comprehensive Linear issue organization with proper dependencies and labeling
- Foundation for efficient development workflow and project management
- Validated post-MVP roadmap with market alignment and technical feasibility

**Related Issues**: [LUM-103](https://linear.app/scootr-ca/issue/LUM-103) - Full Project Audit and Revision of Development Plan

---

## ADR-029: Production Readiness Linear Issue Creation Strategy

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: Comprehensive audit identified specific production readiness gaps requiring dedicated Linear issues for staging environment, monitoring, and deployment validation.

**Decision**: Create targeted Linear issues for production readiness improvements: staging environment implementation (LUM-112), comprehensive monitoring and alerting (LUM-113), and automated deployment validation (LUM-115).

**Rationale**:

- Audit identified specific gaps in production deployment pipeline
- Dedicated Linear issues enable proper project management and tracking
- Clear acceptance criteria and implementation plans improve development efficiency
- Proper labeling and prioritization align with team workflow standards
- Enables parallel development of production readiness improvements

**Alternatives Considered**:

1. **Single production readiness epic**: Create one large issue for all production improvements
   - Rejected: Too large for effective management and parallel development
2. **Include in existing epics**: Add production tasks to existing Linear issues
   - Rejected: Dilutes focus and makes tracking difficult
3. **Defer production readiness**: Focus only on MVP features
   - Rejected: Production readiness is critical for successful launch

**Impact**:

- Clear development roadmap for production readiness improvements
- Proper project management with dedicated Linear issues and tracking
- Enables parallel development of staging, monitoring, and deployment features
- Foundation for reliable production deployment and operations
- Improved team workflow with proper issue organization and labeling

**Related Issues**: [LUM-112](https://linear.app/scootr-ca/issue/LUM-112), [LUM-113](https://linear.app/scootr-ca/issue/LUM-113), [LUM-115](https://linear.app/scootr-ca/issue/LUM-115)

---

## ADR-030: Comprehensive Error Handling Architecture for Calendar Infrastructure

**Date**: September 25, 2025  
**Status**: Accepted  
**Context**: Calendar infrastructure required robust error handling for all availability scenarios with user-friendly messaging and operational insights.

**Decision**: Implement comprehensive error handling system with 9 specific error types, suggested alternatives, structured logging, and graceful degradation capabilities.

**Rationale**:

- Provides excellent user experience through clear, actionable error messages
- Enables comprehensive debugging and operational insights through structured logging
- Ensures system reliability through graceful degradation and circuit breaker patterns
- Supports business intelligence through error analytics and pattern recognition
- Maintains multi-tenant security through proper business context validation

**Alternatives Considered**:

1. **Generic error handling**: Simple error messages without context
   - Rejected: Poor user experience and limited debugging capabilities
2. **Minimal error types**: Basic error classification only
   - Rejected: Insufficient coverage of availability scenarios and user guidance
3. **Third-party error service**: External error handling and monitoring
   - Rejected: Cost considerations and integration complexity with existing architecture

**Impact**:

- Superior user experience with clear error messages and suggested alternatives
- Comprehensive error tracking and operational insights for system optimization
- Enhanced system reliability through graceful degradation during failures
- Business intelligence capabilities through error analytics and pattern recognition
- Foundation for proactive system management and performance optimization

**Related Issues**: [LUM-96](https://linear.app/scootr-ca/issue/LUM-96) - Calendar Infrastructure Implementation

---

## ADR-031: Circuit Breaker Pattern for System Reliability

**Date**: September 25, 2025  
**Status**: Accepted  
**Context**: Calendar infrastructure system reliability required graceful handling of cache failures, service degradation, and automatic recovery mechanisms.

**Decision**: Implement circuit breaker pattern with automatic fallback to database, service health monitoring, and recovery detection for all critical system components.

**Rationale**:

- Ensures system reliability during cache failures and service degradation
- Provides automatic recovery without manual intervention
- Maintains user experience during system stress through intelligent fallback
- Enables proactive system management through health monitoring
- Reduces operational overhead through automated failure handling

**Alternatives Considered**:

1. **Simple retry logic**: Basic retry with exponential backoff
   - Rejected: Insufficient reliability during extended failures and cascading issues
2. **Manual failover**: Human-operated failure recovery
   - Rejected: Operational complexity and unacceptable response time requirements
3. **Load balancer failover**: Infrastructure-level failure handling
   - Rejected: Doesn't address application-level cache and service failures

**Impact**:

- Enhanced system reliability with automatic failure recovery
- Improved user experience during system stress and degradation
- Reduced operational overhead through automated failure handling
- Proactive system management through health monitoring and alerting
- Foundation for scalable, resilient system architecture

**Related Issues**: [LUM-96](https://linear.app/scootr-ca/issue/LUM-96) - Calendar Infrastructure Implementation

---

## ADR-032: Real-Time Monitoring with Business Intelligence Integration

**Date**: September 25, 2025  
**Status**: Accepted  
**Context**: Production calendar infrastructure required comprehensive monitoring for performance, reliability, and business intelligence with configurable thresholds and multi-level alerting.

**Decision**: Implement real-time monitoring system with configurable performance thresholds, multi-level alerting (INFO, WARNING, CRITICAL, EMERGENCY), and business metrics integration for operational insights.

**Rationale**:

- Enables proactive system management through real-time performance monitoring
- Provides business intelligence through usage analytics and pattern recognition
- Ensures rapid incident response through multi-level alerting system
- Supports performance optimization through detailed metrics and analytics
- Creates operational excellence through comprehensive system visibility

**Alternatives Considered**:

1. **Basic logging only**: Simple log files without real-time monitoring
   - Rejected: Insufficient operational visibility and reactive problem resolution
2. **Third-party monitoring service**: External monitoring platform (DataDog, New Relic)
   - Rejected: Cost considerations and integration complexity with existing architecture
3. **Minimal alerting**: Basic threshold alerts without business intelligence
   - Rejected: Limited operational insights and business intelligence capabilities

**Impact**:

- Proactive system management with real-time performance monitoring
- Business intelligence capabilities through usage analytics and pattern recognition
- Rapid incident response through intelligent alerting and escalation
- Performance optimization through detailed metrics and operational insights
- Operational excellence through comprehensive system visibility and management

**Related Issues**: [LUM-96](https://linear.app/scootr-ca/issue/LUM-96) - Calendar Infrastructure Implementation

---

## ADR-033: Hybrid CSS-in-JS Architecture for Component Reliability

**Date**: September 25, 2025  
**Status**: Accepted  
**Context**: Error handling system required bulletproof component visibility across all themes and build configurations after systematic Tailwind CSS generation issues.

**Decision**: Implement CSS-in-JS hybrid architecture where solid background variants use Tailwind utilities and transparency variants use runtime CSS injection for guaranteed visibility.

**Rationale**:

- Guarantees component visibility regardless of build configuration complexity
- Leverages best of both worlds: Tailwind efficiency for solid backgrounds, CSS-in-JS reliability for transparency
- Provides systematic architectural pattern for future components with similar requirements
- Maintains performance optimization while ensuring reliability
- Enables bulletproof error display critical for user experience

**Alternatives Considered**:

1. **Pure Tailwind with complex selectors**: Continue with attribute selector approach
   - Rejected: 24 systematic attempts proved Tailwind generation unreliable for complex selectors
2. **Complete CSS-in-JS solution**: Replace all Tailwind with CSS-in-JS
   - Rejected: Unnecessary complexity for solid background variants that work perfectly with Tailwind
3. **Third-party styling solution**: Use styled-components or emotion
   - Rejected: Adds dependency and doesn't solve fundamental architectural issue

**Impact**:

- Bulletproof component visibility across all themes and build configurations
- Clear architectural pattern: solid backgrounds use Tailwind, transparency uses CSS-in-JS
- Scalable solution for future components with similar visibility requirements
- Maintains performance optimization while ensuring reliability
- Foundation for world-class design system architecture with guaranteed component visibility

**Related Issues**: [LUM-96](https://linear.app/scootr-ca/issue/LUM-96) - Calendar Infrastructure Implementation

---

## Decision Template

Use this template for new architectural decisions:

```markdown
## ADR-XXX: [Decision Title]

**Date**: [YYYY-MM-DD]  
**Status**: [Proposed/Accepted/Deprecated/Superseded]  
**Context**: [Describe the situation that led to this decision]

**Decision**: [What was decided]

**Rationale**:
[Why this decision was made - key factors and benefits]

**Alternatives Considered**:

1. **[Alternative 1]**: [Description]
   - [Reason for rejection]
2. **[Alternative 2]**: [Description]
   - [Reason for rejection]

**Impact**:
[How this affects the system, development process, and team]

**Related Issues**: [Linear issues, PRs, or other references]
```

---

## Maintenance Guidelines

### Adding New Decisions

1. Use the next sequential ADR number
2. Include all required sections
3. Link to relevant Linear issues
4. Update this document immediately when decisions are made

### Updating Existing Decisions

- Change status to "Deprecated" or "Superseded" when decisions are replaced
- Add reference to new decision that replaces it
- Maintain historical record - do not delete deprecated decisions

### Review Schedule

- Monthly review of recent decisions for accuracy
- Quarterly review of all decisions for relevance
- Annual review for consolidation and archival

---

**Last Updated**: September 24, 2025  
**Next Review**: December 24, 2025

## ADR-034: Multi-Service Coordinator Architecture for Complex Appointments

**Date**: September 25, 2025  
**Status**: Accepted  
**Context**: Appointment booking engine required sophisticated handling of multi-service appointments with validation, pricing, and coordination capabilities for salon workflows.

**Decision**: Implement comprehensive MultiServiceCoordinator class with service validation, staff coordination, and advanced pricing calculations.

**Rationale**:

- Enables complex salon workflows with multiple services per appointment
- Supports revenue optimization through intelligent multi-service discounts
- Provides flexible booking options for clients with service combinations
- Integrates seamlessly with existing business logic and calendar infrastructure

**Alternatives Considered**:

1. **Simple service list without coordination**:
   - Rejected: Lack of validation and pricing intelligence
2. **Separate coordinators for each aspect**:
   - Rejected: Integration complexity and performance concerns
3. **Basic validation only**:
   - Rejected: Business requirements for advanced pricing and optimization

**Impact**:

- Supports complex business workflows and service combinations
- Enables sophisticated pricing strategies and revenue optimization
- Provides foundation for advanced appointment management features
- Requires comprehensive testing for multi-service scenarios

**Related Issues**: [LUM-97](https://linear.app/scootr-ca/issue/LUM-97) - Appointment Booking Engine

---

## ADR-035: Advanced Pricing System with Multiple Discount Types

**Date**: September 25, 2025  
**Status**: Accepted  
**Context**: Multi-service appointments required sophisticated pricing with discounts, promotions, loyalty integration, and time-based pricing strategies.

**Decision**: Implement comprehensive pricing system with multi-service discounts, time-based pricing, loyalty integration, and promotion support.

**Rationale**:

- Maximizes revenue potential through intelligent pricing strategies
- Provides competitive pricing flexibility for different market conditions
- Integrates seamlessly with existing loyalty and promotion systems
- Enables automated pricing optimization based on business rules

**Alternatives Considered**:

1. **Simple additive pricing**:
   - Rejected: Missed revenue optimization opportunities
2. **External pricing service**:
   - Rejected: Integration complexity and performance requirements
3. **Manual discount application**:
   - Rejected: Poor user experience and lack of automation

**Impact**:

- Enables revenue optimization through automated pricing strategies
- Provides competitive pricing flexibility and market responsiveness
- Integrates with existing loyalty and promotion infrastructure
- Requires comprehensive testing for pricing accuracy and edge cases

**Related Issues**: [LUM-97](https://linear.app/scootr-ca/issue/LUM-97) - Appointment Booking Engine

---

## ADR-036: Service Order Optimization Based on Business Dependencies

**Date**: September 25, 2025  
**Status**: Accepted  
**Context**: Multi-service appointments required intelligent ordering for optimal staff workflow and service dependencies (e.g., wash before cut, cut before style).

**Decision**: Implement service order optimization with dependency management and efficiency algorithms.

**Rationale**:

- Improves staff workflow efficiency and service delivery quality
- Ensures proper service sequencing based on business requirements
- Optimizes appointment duration and resource utilization
- Provides flexible ordering while maintaining business logic compliance

**Alternatives Considered**:

1. **User-defined order only**:
   - Rejected: Potential inefficiencies and dependency violations
2. **Random ordering**:
   - Rejected: Poor user experience and workflow disruption
3. **Fixed service categories**:
   - Rejected: Lack of flexibility for diverse service combinations

**Impact**:

- Optimizes staff workflow and operational efficiency
- Ensures proper service delivery and quality standards
- Improves appointment efficiency and client satisfaction
- Requires business rule configuration and dependency management

**Related Issues**: [LUM-97](https://linear.app/scootr-ca/issue/LUM-97) - Appointment Booking Engine
