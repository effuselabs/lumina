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

**Related Issues**: [Linear issue for multi-tenancy implementation]

---

## ADR-002: NextAuth.js v5 for Authentication

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

**Related Issues**: [Linear issue for authentication system]

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

**Related Issues**: [Linear issue for database setup]

---

## ADR-004: Documentation-First Development Approach

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

**Related Issues**: [Linear issue for documentation best practices]

---

## ADR-005: Steering System for Development Standards

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

**Related Issues**: [Linear issue for steering system implementation]

---

## ADR-006: Next.js App Router Architecture

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

**Related Issues**: [Linear issue for Next.js setup]

---

## ADR-007: Remove Spec for Documentation Audit

**Date**: September 6, 2025  
**Status**: accepted  
**Context**: The documentation audit spec (`.kiro/specs/completed/documentation-audit-plan/`) was created to manage comprehensive documentation cleanup and migration. However, during development, we discovered that the audit scripts have critical safety issues and the documentation system is already in good shape after manual cleanup efforts.

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

---

## ADR-008: Complete Authentication System Rebuild

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

---

## ADR-010: Single Route Structure for Business Dashboards

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

## ADR-019: Dashboard-Specific Theme Storage Strategy

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

## ADR-020: ThemeProvider Integration Pattern for Dashboard

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

---

## ADR-021: Comprehensive Design System Implementation Strategy

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

## ADR-022: Design Token Foundation as Core Architecture

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

---

## ADR-023: Accessibility-First Implementation Approach

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

## ADR-011: Comprehensive Design System Implementation

**Date**: December 9, 2024  
**Status**: Accepted  
**Context**: Recurring text visibility issues and styling inconsistencies across components indicated fundamental problems with design system implementation. Multiple components had unreadable light gray text and inconsistent styling patterns.

**Decision**: Implement comprehensive Lumina Design System v2.0 with proper CSS variable mapping, utility classes, and component-level styling standards.

**Rationale**:

- Systematic approach addresses root cause rather than individual component fixes
- Proper CSS variable mapping eliminates conflicting color definitions
- Utility classes ensure consistent styling across all components
- Design system compliance improves accessibility and user experience
- Comprehensive documentation prevents future styling issues

**Alternatives Considered**:

1. **Component-by-component fixes**: Fix styling issues individually as they arise
   - Rejected: Doesn't address root cause, leads to inconsistent implementations
2. **Third-party design system**: Use existing design system like Chakra UI or Mantine
   - Rejected: Doesn't match Lumina brand requirements and visual identity
3. **Minimal styling approach**: Use basic Tailwind classes without systematic approach
   - Rejected: Leads to inconsistency and poor accessibility compliance

**Impact**:

- All components now use consistent Lumina brand colors and typography
- Improved accessibility with WCAG 2.1 AA compliant color contrast ratios
- Enhanced developer experience with utility classes and TypeScript helpers
- Comprehensive documentation prevents future styling inconsistencies
- Foundation for scalable design system across entire application

**Related Issues**: [LUM-76](https://linear.app/scootr-ca/issue/LUM-76) - Quality Assurance

---

## ADR-012: Best Practice Form Validation Implementation

**Date**: December 9, 2024  
**Status**: Accepted  
**Context**: Staff edit forms had controlled input warnings and validation issues when switching between employment types. Need robust form validation that handles complex conditional requirements.

**Decision**: Implement best-practice form validation using React Hook Form with Zod schema validation, proper controlled inputs, and field-specific error handling.

**Rationale**:

- Eliminates React controlled input warnings with proper value handling
- Zod schema validation provides type-safe validation with excellent error messages
- Field-specific validation allows complex conditional requirements
- Industry-standard approach ensures maintainable and reliable forms
- Proper error handling improves user experience

**Alternatives Considered**:

1. **Basic HTML5 validation**: Use native browser validation
   - Rejected: Insufficient for complex conditional validation requirements
2. **Custom validation logic**: Build validation from scratch
   - Rejected: Reinventing the wheel, prone to bugs and inconsistencies
3. **Formik with Yup**: Alternative form library and validation
   - Rejected: React Hook Form has better performance and TypeScript integration

**Impact**:

- All forms use consistent validation patterns and error handling
- Improved user experience with clear, field-specific error messages
- Enhanced developer experience with type-safe validation schemas
- Foundation for complex form validation throughout application
- Eliminates console warnings and form behavior issues

**Related Issues**: [LUM-76](https://linear.app/scootr-ca/issue/LUM-76) - Quality Assurance

---

## ADR-013: CUID Validation for Prisma Compatibility

**Date**: December 9, 2024  
**Status**: Accepted  
**Context**: Client creation and editing forms were failing validation because Prisma uses CUID format for IDs, but validation schemas were expecting UUID format.

**Decision**: Update all validation schemas to use CUID validation instead of UUID validation for Prisma-generated IDs.

**Rationale**:

- Prisma generates CUIDs by default, not UUIDs
- CUID format is `c[a-z0-9]{24}` vs UUID format `[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`
- Validation must match actual database ID format for proper functionality
- Consistent validation across all API endpoints prevents similar issues

**Alternatives Considered**:

1. **Change Prisma to use UUIDs**: Modify Prisma schema to generate UUIDs
   - Rejected: Would require database migration and potential data loss
2. **Accept both formats**: Allow both CUID and UUID in validation
   - Rejected: Adds unnecessary complexity and potential security issues
3. **Custom ID generation**: Implement custom UUID generation in Prisma
   - Rejected: Overrides Prisma defaults and adds maintenance overhead

**Impact**:

- All API validation schemas updated to use CUID validation
- Client creation and editing now work correctly
- Consistent ID validation across entire application
- Foundation for proper Prisma integration patterns

**Related Issues**: [LUM-76](https://linear.app/scootr-ca/issue/LUM-76) - Quality Assurance

---

## ADR-014: Null vs Empty String Handling in Forms

**Date**: December 9, 2024  
**Status**: Accepted  
**Context**: Client editing forms had issues with "No preference" selections where empty strings were being sent but the API expected null values for database storage.

**Decision**: Implement consistent null/empty string transformation pattern: frontend sends empty strings, API transforms to null for database storage.

**Rationale**:

- Zod validation works better with empty strings than null values
- Database storage should use null for "no value" semantics
- Consistent transformation pattern prevents validation errors
- Clear separation between form handling and database storage

**Alternatives Considered**:

1. **Send null from frontend**: Have forms send null directly
   - Rejected: Zod validation has issues with null values in union types
2. **Store empty strings in database**: Use empty strings for "no value"
   - Rejected: Null is semantically correct for "no value" in databases
3. **Complex validation schemas**: Handle both null and empty strings everywhere
   - Rejected: Adds unnecessary complexity and potential bugs

**Impact**:

- Consistent form validation without null-related errors
- Proper database semantics with null values
- Clear transformation pattern for future forms
- Improved user experience with reliable form submissions

**Related Issues**: [LUM-76](https://linear.app/scootr-ca/issue/LUM-76) - Quality Assurance

---

## ADR-015: Dynamic Route Consolidation for API Architecture

**Date**: December 9, 2024  
**Status**: Accepted  
**Context**: Next.js was throwing errors about conflicting dynamic route names (`[id]` vs `[clientId]`) in the same path structure, preventing proper API functionality.

**Decision**: Consolidate to single dynamic route naming convention and remove duplicate/conflicting routes.

**Rationale**:

- Next.js doesn't allow different dynamic route names in the same path structure
- Existing `[clientId]` route already included all needed functionality
- Simpler architecture with fewer API endpoints is easier to maintain
- Eliminates routing conflicts and improves reliability

**Alternatives Considered**:

1. **Rename all routes to use consistent naming**: Change `[clientId]` to `[id]`
   - Rejected: Would require updating existing working code
2. **Use different path structures**: Separate routes into different directories
   - Rejected: Creates unnecessary complexity and inconsistent API patterns
3. **Complex route matching**: Use middleware to handle route conflicts
   - Rejected: Adds complexity and potential failure points

**Impact**:

- Eliminated Next.js routing conflicts
- Simplified API architecture with fewer endpoints
- Improved reliability and maintainability
- Foundation for consistent API routing patterns

**Related Issues**: [LUM-76](https://linear.app/scootr-ca/issue/LUM-76) - Quality Assurance

---

## ADR-016: Linear Labeling Standards Implementation

**Date**: September 11, 2025  
**Status**: Accepted  
**Context**: Post-MVP issues were created without proper Linear labels, resulting in inconsistent project organization and poor issue discoverability. Team has established Linear best practices documentation that wasn't being followed.

**Decision**: Apply comprehensive Linear labeling system following documented best practices for all issues, ensuring consistent component, size, priority, and type labeling.

**Rationale**:

- Ensures consistent project organization and improves team workflow
- Improves issue discoverability through proper filtering and categorization
- Follows established team standards documented in Linear best practices
- Enables better project reporting and progress tracking
- Maintains professional Linear workspace organization

**Alternatives Considered**:

1. **Leave issues without labels**: Continue with minimal labeling approach
   - Rejected: Poor organization makes issues difficult to find and manage
2. **Create custom labels**: Develop new labeling system for post-MVP work
   - Rejected: Conflicts with existing team standards and creates inconsistency
3. **Minimal labeling**: Apply only basic labels like priority
   - Rejected: Insufficient categorization for complex project management needs

**Impact**:

- Improves Linear workspace organization and team productivity
- Enables better filtering, reporting, and project visibility
- Maintains consistency with established team practices
- Provides foundation for scalable project management as team grows
- Enhances collaboration through clear issue categorization

**Related Issues**: [LUM-84](https://linear.app/scootr-ca/issue/LUM-84), [LUM-85](https://linear.app/scootr-ca/issue/LUM-85), [LUM-86](https://linear.app/scootr-ca/issue/LUM-86), [LUM-87](https://linear.app/scootr-ca/issue/LUM-87), [LUM-88](https://linear.app/scootr-ca/issue/LUM-88), [LUM-68](https://linear.app/scootr-ca/issue/LUM-68)

---

## ADR-017: AI-Enhanced Onboarding as Strategic Innovation

**Date**: September 11, 2025  
**Status**: Accepted  
**Context**: Need for competitive differentiation in salon management software market and significant improvement to user onboarding experience. Traditional manual onboarding creates friction and reduces user adoption.

**Decision**: Develop AI-powered onboarding system with document intelligence and website analysis capabilities to automatically extract and populate business information.

**Rationale**:

- Creates unique market differentiator that competitors don't offer
- Significantly improves user experience with 70% reduction in onboarding time
- Positions Lumina as technology leader in salon management space
- Reduces onboarding friction which directly impacts user adoption and retention
- Establishes foundation for future AI-powered features and capabilities

**Alternatives Considered**:

1. **Enhanced manual onboarding**: Improve existing manual setup process
   - Rejected: Limited improvement potential, doesn't address fundamental friction
2. **Basic import improvements**: Focus on better file import capabilities
   - Rejected: Incremental value, doesn't provide competitive differentiation
3. **Third-party onboarding tools**: Integrate existing onboarding platforms
   - Rejected: No differentiation, adds external dependencies and costs

**Impact**:

- Establishes Lumina as innovation leader in salon management software
- Provides significant competitive advantage through unique AI capabilities
- Improves user adoption and reduces onboarding abandonment rates
- Creates foundation for advanced AI features and intelligent insights
- Requires investment in AI infrastructure and expertise development

**Related Issues**: [LUM-88](https://linear.app/scootr-ca/issue/LUM-88) - AI-Enhanced Onboarding with Intelligent Business Setup

---

## ADR-018: Dashboard Enhancement with Professional Analytics

**Date**: January 9, 2025  
**Status**: Accepted  
**Context**: Basic dashboard with simple stat cards was insufficient for a best-in-class SaaS platform. Users needed comprehensive business intelligence, real-time analytics, and professional data visualization to make informed business decisions.

**Decision**: Implement comprehensive dashboard enhancement with professional sidebar navigation, real-time analytics, and interactive charts using Recharts library.

**Rationale**:

- Creates competitive advantage through superior user experience and business intelligence
- Transforms basic management tool into comprehensive business intelligence platform
- Provides salon owners with actionable insights for data-driven decision making
- Establishes foundation for advanced AI-powered features and recommendations
- Meets enterprise-level expectations for SaaS dashboard functionality

**Alternatives Considered**:

1. **Incremental dashboard improvements**: Enhance existing basic dashboard gradually
   - Rejected: Insufficient transformation, doesn't address fundamental UX limitations
2. **Third-party dashboard integration**: Use existing business intelligence platforms
   - Rejected: Vendor lock-in, doesn't align with Lumina brand experience
3. **Basic chart library**: Use simpler charting solutions like Chart.js
   - Rejected: Limited customization and professional appearance capabilities

**Impact**:

- Establishes Lumina as premium SaaS platform with enterprise-level capabilities
- Significantly improves user engagement and business value perception
- Provides foundation for advanced analytics and AI-powered insights
- Requires ongoing maintenance of complex data visualization components
- Creates differentiation from competitors with basic management interfaces

**Related Issues**: [LUM-76](https://linear.app/scootr-ca/issue/LUM-76) - Quality Assurance

---

## ADR-019: Recharts for Data Visualization

**Date**: January 9, 2025  
**Status**: Accepted  
**Context**: Dashboard enhancement required professional data visualization library that supports Lumina brand theming, interactive features, and responsive design.

**Decision**: Use Recharts library for all dashboard charts and data visualization components.

**Rationale**:

- Excellent React integration with component-based architecture
- Comprehensive chart types (area, bar, pie, radar) for diverse business metrics
- Full customization support for Lumina brand colors and styling
- Interactive features (tooltips, hover states, click events) for enhanced UX
- Strong TypeScript support and active maintenance community
- Responsive design capabilities for mobile-first approach

**Alternatives Considered**:

1. **Chart.js with React wrapper**: Popular charting library
   - Rejected: Limited React integration and customization flexibility
2. **D3.js direct implementation**: Maximum customization control
   - Rejected: High development complexity and maintenance overhead
3. **Victory Charts**: React-native compatible charting
   - Rejected: Less comprehensive documentation and smaller community
4. **Nivo Charts**: React charting library
   - Rejected: Steeper learning curve and less flexible theming

**Impact**:

- Enables professional data visualization with Lumina brand consistency
- Provides foundation for advanced chart types and interactive features
- Requires learning Recharts-specific patterns and customization approaches
- Creates dependency on external library for critical dashboard functionality
- Enables rapid development of new chart types and visualizations

**Related Issues**: [LUM-76](https://linear.app/scootr-ca/issue/LUM-76) - Quality Assurance

---

## ADR-020: Real-time Dashboard Data Strategy

**Date**: January 9, 2025  
**Status**: Accepted  
**Context**: Dashboard needs to provide current business data while balancing performance, server load, and user experience expectations for a professional SaaS platform.

**Decision**: Implement 30-second automatic refresh intervals with React Query caching and manual refresh capability.

**Rationale**:

- 30-second intervals provide near real-time feel without excessive server load
- React Query provides intelligent caching and background updates
- Manual refresh gives users control over data freshness
- Stale-while-revalidate pattern ensures responsive UI during updates
- Configurable refresh intervals allow future optimization based on usage patterns

**Alternatives Considered**:

1. **WebSocket real-time updates**: Live data streaming
   - Rejected: Complexity overhead and server resource requirements for current scale
2. **5-second refresh intervals**: More frequent updates
   - Rejected: Excessive server load and API calls for marginal UX improvement
3. **Manual refresh only**: User-controlled data updates
   - Rejected: Doesn't meet expectations for modern SaaS dashboard experience
4. **Event-driven updates**: Update only when data changes
   - Rejected: Complex implementation requiring event infrastructure

**Impact**:

- Provides excellent balance of data freshness and performance
- Enables scalable dashboard experience as user base grows
- Creates foundation for future real-time features when needed
- Requires monitoring of API performance and server load
- Allows easy adjustment of refresh intervals based on usage analytics

**Related Issues**: [LUM-76](https://linear.app/scootr-ca/issue/LUM-76) - Quality Assurance

---

## ADR-021: Dashboard-Specific Design System Extension

**Date**: January 9, 2025  
**Status**: Accepted  
**Context**: Existing Lumina Design System v2.0 needed extension with dashboard-specific components, layouts, and interaction patterns while maintaining brand consistency.

**Decision**: Extend existing design system with dashboard-specific CSS variables, typography scales, and component patterns rather than creating separate system.

**Rationale**:

- Maintains consistency with established Lumina Design System v2.0
- Extends existing foundation rather than duplicating design tokens
- Enables dashboard-specific optimizations (metric typography, chart colors)
- Preserves design system governance and maintenance efficiency
- Allows future consolidation of dashboard patterns into main design system

**Alternatives Considered**:

1. **Separate dashboard design system**: Independent styling system
   - Rejected: Creates maintenance overhead and potential inconsistencies
2. **Minimal dashboard styling**: Use only existing design system tokens
   - Rejected: Insufficient for professional dashboard requirements
3. **Third-party dashboard theme**: Use pre-built dashboard styling
   - Rejected: Doesn't align with Lumina brand identity and customization needs

**Impact**:

- Maintains design system consistency while enabling dashboard innovation
- Creates reusable patterns for future dashboard and analytics features
- Requires careful documentation to prevent design system fragmentation
- Enables rapid development of new dashboard components
- Provides foundation for design system evolution and consolidation

**Related Issues**: [LUM-76](https://linear.app/scootr-ca/issue/LUM-76) - Quality Assurance

---

## ADR-022: Documentation Standards Compliance Strategy

**Date**: January 17, 2025  
**Status**: Accepted  
**Context**: Previous dashboard enhancement work needed to be properly documented according to established documentation standards and Linear integration guidelines to ensure AI context preservation and team collaboration.

**Decision**: Implement comprehensive documentation update following established steering documentation standards with focus on AI context preservation and Linear integration.

**Rationale**:

- Ensures consistency with established documentation patterns and quality standards
- Maintains proper context for future AI-human collaboration sessions
- Provides comprehensive reference for team members and stakeholders
- Enables proper Linear integration and issue tracking for documentation work
- Supports documentation-first development approach and quality assurance

**Alternatives Considered**:

1. **Minimal Documentation Update**: Update only essential documentation
   - Rejected: Doesn't meet established documentation standards for feature completion
2. **Separate Documentation Session**: Schedule dedicated documentation session later
   - Rejected: Breaks documentation-first development principle and context continuity
3. **Automated Documentation Generation**: Use tools to generate documentation automatically
   - Rejected: Doesn't capture decision rationale and architectural context needed for AI collaboration

**Impact**:

- Establishes comprehensive documentation foundation for dashboard enhancement work
- Enables proper knowledge transfer and context preservation for future development
- Provides clear reference for implementation details and architectural decisions
- Supports Linear integration and project management workflows
- Maintains documentation quality standards and consistency across project

**Related Issues**: Documentation standards compliance and AI context preservation

---

## ADR-023: Design System Documentation Enhancement Approach

**Date**: January 17, 2025  
**Status**: Accepted  
**Context**: Dashboard enhancement introduced new design patterns, components, and CSS variables that needed to be properly documented within the existing Lumina Design System framework.

**Decision**: Extend existing design system documentation with dashboard-specific sections while maintaining consistency with established design system structure and patterns.

**Rationale**:

- Maintains consistency with existing Lumina Design System v2.0 documentation structure
- Provides comprehensive guidance for dashboard component usage and implementation
- Enables future developers to properly implement dashboard features following established patterns
- Supports design system evolution and consolidation efforts
- Preserves design system governance and prevents fragmentation

**Alternatives Considered**:

1. **Separate Dashboard Design Documentation**: Create independent documentation for dashboard design patterns
   - Rejected: Creates fragmentation and maintenance overhead for design system
2. **Minimal Design Documentation**: Document only essential design changes
   - Rejected: Insufficient for comprehensive design system maintenance and team guidance
3. **Complete Design System Rewrite**: Restructure entire design system documentation
   - Rejected: Unnecessary scope expansion and potential disruption to existing workflows

**Impact**:

- Provides comprehensive design guidance for dashboard and analytics components
- Maintains design system consistency and governance
- Enables proper implementation of dashboard features by team members
- Supports future design system evolution and enhancement efforts
- Creates foundation for design system consolidation and improvement

**Related Issues**: Design system maintenance and component documentation standards

---

## ADR-024: Dashboard Accessibility Enhancement for Color Contrast

**Date**: January 17, 2025  
**Status**: Accepted  
**Context**: User feedback identified poor color contrast in dashboard navigation active states and Quick Actions buttons, where white text on orange gradient background was difficult to read and failed WCAG 2.1 AA accessibility standards.

**Decision**: Replace gradient backgrounds with high-contrast color combinations using light gold backgrounds with dark gold text and borders for better accessibility while maintaining Lumina brand identity.

**Rationale**:

- Ensures WCAG 2.1 AA compliance with proper color contrast ratios for accessibility
- Maintains Lumina brand identity using gold color palette variations
- Improves user experience for users with visual impairments or color vision deficiencies
- Provides better legibility across different devices and lighting conditions
- Establishes accessible design patterns for future dashboard components

**Alternatives Considered**:

1. **Darker gradient backgrounds**: Use darker orange/gold gradients with white text
   - Rejected: Still insufficient contrast ratio and maintains gradient complexity
2. **Outline-only buttons**: Use transparent backgrounds with colored borders
   - Rejected: Insufficient visual prominence for primary actions
3. **High contrast mode toggle**: Provide accessibility mode with different colors
   - Rejected: Adds complexity and doesn't address core design issue

**Impact**:

- Improves accessibility compliance and user experience for all users
- Establishes better design patterns for future dashboard components
- Maintains Lumina brand consistency while prioritizing accessibility
- Requires minimal code changes with CSS variable updates
- Provides foundation for comprehensive accessibility review of entire design system

**Related Issues**: Dashboard accessibility and WCAG 2.1 AA compliance

---

## ADR-024: Today's Schedule Card Component Architecture

**Date**: September 17, 2025  
**Status**: Accepted  
**Context**: The existing Today's Schedule card used legacy CSS classes and inline styling that didn't align with the enhanced dashboard components and Lumina design system standards.

**Decision**: Create dedicated reusable components (`ScheduleItem` and `TodaysScheduleCard`) using Tailwind utility classes and proper TypeScript interfaces for appointment data.

**Rationale**:

- Maintains consistency with other enhanced dashboard components
- Provides proper TypeScript typing for appointment data structures
- Enables reusability across different dashboard views and contexts
- Implements proper loading states and empty state handling
- Supports status-based styling with animated indicators
- Follows established component architecture patterns

**Alternatives Considered**:

1. **Update Existing CSS Classes**: Modify existing schedule-item CSS classes
   - Rejected: Doesn't align with Tailwind-first approach and component reusability goals
2. **Inline Component in Dashboard**: Keep schedule card as inline JSX in business dashboard
   - Rejected: Reduces reusability and maintainability, doesn't follow component architecture standards
3. **Simple Styling Update**: Only update colors and spacing without component extraction
   - Rejected: Misses opportunity for proper TypeScript typing and reusability improvements

**Impact**:

- Establishes reusable schedule components for use across dashboard views
- Provides proper TypeScript interfaces for appointment data handling
- Enables consistent status indicators and animations across schedule features
- Supports future schedule-related feature development with established patterns
- Maintains design system consistency with other dashboard components

**Related Issues**: Dashboard component standardization and schedule feature development

---

## ADR-025: Dashboard Link Styling Consistency

**Date**: September 17, 2025  
**Status**: Accepted  
**Context**: The dashboard had inconsistent link styling across different components - stat cards used professional action links, Today's Schedule card used button styling, and quick actions had secondary links with different visual treatment.

**Decision**: Standardize all dashboard links to use consistent styling patterns based on their context and function.

**Rationale**:

- Improves user experience through consistent visual language
- Reduces cognitive load by using familiar interaction patterns
- Maintains design system integrity across all dashboard components
- Creates clear hierarchy between primary actions (buttons) and navigation links
- Follows established Lumina design system principles

**Alternatives Considered**:

1. **Keep Mixed Styling**: Maintain different styles for different components
   - Rejected: Creates inconsistent user experience and violates design system principles
2. **Convert All to Buttons**: Make all links use button styling
   - Rejected: Buttons should be reserved for actions, not navigation
3. **Create New Link Style**: Design a completely new link style for dashboard
   - Rejected: Existing stat card action links already provide excellent UX

**Impact**:

- Establishes consistent link styling patterns across all dashboard components
- Improves visual hierarchy and user experience
- Reduces maintenance overhead by using existing design system components
- Creates foundation for consistent styling in future dashboard features
- Enhances accessibility through consistent interaction patterns

**Related Issues**: Dashboard UI consistency and design system compliance

---

## ADR-026: Dashboard Component Design System Standardization

**Date**: September 17, 2025  
**Status**: Accepted  
**Context**: The Today's Schedule component and other dashboard elements were using inconsistent typography, spacing, and styling patterns that didn't align with the established design system used in stat cards, headers, and navigation components.

**Decision**: Establish comprehensive design system standards for all dashboard components with consistent typography hierarchy, color usage, spacing patterns, and component structure templates.

**Rationale**:

- Ensures visual consistency across all dashboard components
- Reduces development time by providing clear patterns and reusable CSS classes
- Improves maintainability by centralizing design decisions
- Creates professional, sophisticated appearance aligned with Lumina brand standards
- Enables scalable component development with established best practices
- Provides clear documentation for future developers and AI assistance

**Alternatives Considered**:

1. **Component-Specific Styling**: Allow each component to define its own styling
   - Rejected: Creates inconsistency and maintenance overhead
2. **Minimal Standardization**: Only standardize colors, leave typography flexible
   - Rejected: Insufficient for achieving professional, consistent appearance
3. **Complete Redesign**: Start over with entirely new design system
   - Rejected: Existing patterns work well, just need proper documentation and application

**Impact**:

- Establishes comprehensive design system documentation for dashboard components
- Creates reusable CSS classes for consistent typography and styling
- Improves visual hierarchy and professional appearance across dashboard
- Reduces future development time through established patterns
- Enables consistent component development and maintenance
- Provides foundation for design system evolution and enhancement

**Related Issues**: Design system consistency, dashboard component standardization, and professional UI development

---

## ADR-027: Professional Schedule Item Design Enhancement

**Date**: September 17, 2025  
**Status**: Accepted  
**Context**: The schedule items in the Today's Schedule component needed a more sophisticated, professional appearance to match the high-quality standards expected by business owners using Lumina.

**Decision**: Implement a completely redesigned schedule item with structured layout, status indicators, enhanced typography hierarchy, and subtle professional interactions.

**Rationale**:

- Creates a more sophisticated, business-professional appearance
- Improves information hierarchy and readability through structured layout
- Provides clear visual status indicators without being overwhelming
- Enhances user experience with subtle, professional hover interactions
- Aligns with Lumina's positioning as a premium business tool
- Establishes patterns for other list-based components in the system

**Alternatives Considered**:

1. **Minor Styling Updates**: Small tweaks to existing design
   - Rejected: Insufficient for achieving the professional appearance required
2. **Card-Based Items**: Each appointment as a separate card
   - Rejected: Would create too much visual noise and take up excessive space
3. **Table Layout**: Traditional table structure for appointments
   - Rejected: Less flexible and harder to make responsive

**Impact**:

- Significantly improves the professional appearance of the dashboard
- Creates reusable patterns for other list-based components
- Enhances user perception of Lumina as a premium business tool
- Provides foundation for consistent professional styling across the application
- Improves information hierarchy and user experience

**Related Issues**: Professional UI design, business user experience, and premium product positioning

---

## ADR-028: Comprehensive Design System Audit Approach

**Date**: September 18, 2025  
**Status**: Accepted  
**Context**: The Lumina application showed inconsistent styling patterns across components, with dashboard components demonstrating high-quality design while other pages used generic styling. Need systematic approach to achieve design consistency.

**Decision**: Conduct comprehensive design system audit before implementing fixes, using dashboard components as gold standard template for system-wide consistency.

**Rationale**:

- Systematic audit identifies root causes rather than addressing symptoms
- Dashboard components demonstrate proper Lumina brand integration and professional quality
- Comprehensive analysis enables informed prioritization and resource allocation
- Establishes clear template and patterns for consistent implementation
- Prevents fragmented fixes that could create new inconsistencies

**Alternatives Considered**:

1. **Component-by-component fixes**: Address styling issues individually as discovered
   - Rejected: Doesn't address systemic issues, leads to inconsistent implementations
2. **Complete redesign**: Start over with entirely new design system
   - Rejected: Dashboard components already demonstrate excellent quality standards
3. **Minimal standardization**: Focus only on color consistency
   - Rejected: Insufficient for achieving professional, cohesive user experience

**Impact**:

- Provides comprehensive roadmap for design system improvements
- Establishes dashboard components as reusable template for quality standards
- Enables systematic implementation with clear priorities and success metrics
- Creates foundation for scalable design system maintenance and governance
- Improves development efficiency through established patterns and documentation

**Related Issues**: Design System Consistency Spec - Task 1 completion

---

**Last Updated**: September 18, 2025  
**Next Review**: December 18, 2025
