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

## ADR-024: Design System Critical Issues Specification

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

---

## ADR-025: Framework Best Practices Integration Strategy

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

## ADR-027: Comprehensive Business Logic Validation System

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: Need robust validation system to ensure data integrity and business rule compliance during seed generation, preventing invalid appointments, double-booking, and financial inconsistencies.

**Decision**: Implement comprehensive validator system with AvailabilityChecker, ScheduleValidator, ServiceCompatibilityValidator, and FinancialIntegrityValidator classes providing unified business logic validation.

**Rationale**:

- Ensures generated data follows business constraints and prevents invalid data scenarios
- Prevents double-booking and scheduling conflicts through sophisticated availability checking
- Validates financial integrity with transaction amount matching and commission calculations
- Provides modular validation architecture for different business scenarios
- Enables comprehensive data quality assurance during seed generation

**Alternatives Considered**:

1. **Basic validation only**: Simple data type and format validation
   - Rejected: Insufficient for complex business logic and relationship validation
2. **Post-generation validation**: Validate data after generation is complete
   - Rejected: Inefficient and allows invalid data to be created initially
3. **External validation service**: Use third-party validation tools
   - Rejected: Doesn't understand Lumina-specific business logic and constraints

**Impact**:

- Guaranteed data integrity and business rule compliance during seed generation
- Prevention of invalid appointments, double-booking, and financial inconsistencies
- Modular validation system that can be extended for new business rules
- Comprehensive error reporting and validation feedback for debugging
- Foundation for production data validation and quality assurance

**Related Issues**: [LUM-94](https://linear.app/scootr-ca/issue/LUM-94) - Comprehensive Demo Data Enhancement

---

## ADR-028: Comprehensive Data Reset and Management System

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: Need robust data management utilities for seed data lifecycle including clean reset procedures, data validation, and environment-specific configurations to support development, testing, and demonstration workflows.

**Decision**: Implement comprehensive data reset and management system with DataResetManager class, CLI management tool, predefined scenarios, and enhanced seed integration providing complete seed data lifecycle management.

**Rationale**:

- Provides safe and reliable data reset procedures maintaining referential integrity
- Enables environment-specific seeding with appropriate data volumes and configurations
- Offers comprehensive data validation ensuring business logic compliance and data quality
- Includes safety features like dry-run mode and preservation options to prevent data loss
- Supports development workflow with CLI tools and automated validation processes
- Establishes foundation for production data management and quality assurance

**Alternatives Considered**:

1. **Manual data management**: Rely on manual database operations for data reset and validation
   - Rejected: Error-prone, time-consuming, lacks safety features and validation
2. **Simple reset scripts**: Basic scripts for data deletion without comprehensive management
   - Rejected: Lacks validation, safety features, and environment-specific configurations
3. **Third-party data management tools**: Use external tools for seed data management
   - Rejected: Doesn't understand Lumina-specific business logic and multi-tenant architecture

**Impact**:

- Complete seed data lifecycle management with safety and validation features
- Environment-specific configurations supporting development, testing, and demonstration workflows
- CLI tools enabling efficient data management operations for developers and administrators
- Comprehensive validation ensuring data quality and business logic compliance
- Foundation for scalable data management supporting team development and production operations
- Integration with existing factory system and multi-tenant security architecture

**Related Issues**: [LUM-94](https://linear.app/scootr-ca/issue/LUM-94) - Comprehensive Demo Data Enhancementides comprehensive error reporting with structured validation results

- Enables business rule enforcement during data generation and runtime operations
- Creates foundation for reliable appointment booking and business operations

**Alternatives Considered**:

1. **Basic validation only**: Simple checks without comprehensive business logic
   - Rejected: Risk of invalid data generation and business rule violations
2. **External validation service**: Third-party validation system
   - Rejected: Complexity, performance overhead, and dependency management issues
3. **Post-generation validation**: Validate data after generation rather than during
   - Rejected: Inefficient approach with potential for data corruption and waste

**Impact**:

- Guaranteed data integrity and business rule compliance throughout system
- Prevention of invalid appointments, double-booking, and financial inconsistencies
- Comprehensive error reporting enabling proper debugging and issue resolution
- Foundation for reliable appointment booking and business operations
- Scalable validation architecture supporting future business rule additions
- Enhanced data quality for analytics and reporting accuracy

**Related Issues**: [LUM-94](https://linear.app/scootr-ca/issue/LUM-94) - Comprehensive Demo Data Enhancement

---

## ADR-028: Temporal Data Distribution Strategy for Historical Appointments

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: Historical appointment data needs realistic temporal patterns for meaningful analytics demonstration, including seasonal variations, peak hours, and booking patterns that reflect actual salon business operations.

**Decision**: Implement weighted temporal distribution with seasonal variations, peak hours, and booking patterns using sophisticated algorithms that create realistic business patterns for analytics demonstration.

**Rationale**:

- Creates realistic business patterns that demonstrate platform analytics capabilities effectively
- Enables meaningful dashboard widgets and reporting with authentic data distributions
- Showcases seasonal business variations and peak hour patterns for sales demonstrations
- Provides foundation for testing analytics algorithms with realistic data patterns
- Demonstrates platform's ability to handle complex business intelligence requirements

**Alternatives Considered**:

1. **Random distribution**: Generate appointments with uniform random distribution
   - Rejected: Unrealistic patterns that don't demonstrate analytics capabilities effectively
2. **Linear distribution**: Evenly distribute appointments across time periods
   - Rejected: Lacks seasonal and business pattern variations needed for meaningful analytics
3. **Simple pattern distribution**: Basic peak/off-peak patterns only
   - Rejected: Insufficient complexity to demonstrate advanced analytics capabilities

**Impact**:

- Realistic analytics data that effectively demonstrates platform capabilities
- Meaningful reporting patterns that showcase business intelligence features
- Enhanced sales demonstration value with authentic business data patterns
- Foundation for testing and validating analytics algorithms with realistic data
- Improved user evaluation experience with recognizable business patterns

**Related Issues**: [LUM-94](https://linear.app/scootr-ca/issue/LUM-94) - Comprehensive Demo Data Enhancement

---

## ADR-028: Comprehensive Business Operations Schema Extension

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: Demo data needed to showcase inventory management, promotions, gift cards, marketing campaigns, and loyalty programs to demonstrate complete platform capabilities for sales and evaluation purposes.

**Decision**: Extend database schema with 12 new models for complete business operations including Product, ProductSale, GiftCard, GiftCardRedemption, Promotion, PromotionUsage, MarketingCampaign, CampaignRecipient, LoyaltyProgram, LoyaltyMembership, and LoyaltyTransaction.

**Rationale**:

- Enables demonstration of all platform features with realistic business data
- Provides comprehensive business operations ecosystem for effective sales presentations
- Creates foundation for testing all platform capabilities with integrated data
- Demonstrates platform's scalability and feature completeness
- Enables realistic business scenario testing and validation

**Alternatives Considered**:

1. **Minimal business operations**: Add only basic product and promotion models
   - Rejected: Incomplete feature demonstration that doesn't showcase platform capabilities
2. **External data simulation**: Mock business operations data without database integration
   - Rejected: Integration complexity, maintenance overhead, and poor demonstration value
3. **Phased implementation**: Add business operations models incrementally over time
   - Rejected: Delays comprehensive feature demonstration and creates integration complexity

**Impact**:

- Complete feature showcase enabling effective sales demonstrations and user evaluation
- Realistic business operations data supporting all platform capabilities
- Comprehensive platform demonstration with integrated business ecosystem
- Foundation for testing complex business scenarios and feature interactions
- Enhanced user evaluation experience with complete business operations visibility

**Related Issues**: [LUM-94](https://linear.app/scootr-ca/issue/LUM-94) - Comprehensive Demo Data Enhancement

---

## ADR-029: Factory Pattern Architecture for Scalable Data Generation

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: Comprehensive demo data generation required scalable, maintainable approach for creating diverse realistic data entities across multiple business domains with proper relationships and business logic validation.

**Decision**: Implement comprehensive factory pattern architecture with specialized factories (ProductFactory, GiftCardFactory, PromotionFactory, MarketingCampaignFactory, LoyaltyProgramFactory) orchestrated by BusinessOperationsFactory for coordinated data generation.

**Rationale**:

- Enables reusable, testable data generation with proper separation of concerns
- Provides scalable architecture for complex business data relationships
- Ensures business logic validation and realistic data patterns
- Facilitates maintenance and extension of data generation capabilities
- Creates foundation for comprehensive testing and validation

**Alternatives Considered**:

1. **Monolithic data generation**: Single large function generating all business operations data
   - Rejected: Maintainability challenges, testing difficulties, and poor separation of concerns
2. **Simple data arrays**: Static data arrays without business logic
   - Rejected: Lack of business logic validation, poor relationship management, unrealistic patterns
3. **External data services**: Third-party data generation services
   - Rejected: Vendor dependency, integration complexity, and limited customization capabilities

**Impact**:

- Scalable architecture enabling easy extension and maintenance of data generation
- Comprehensive business logic validation ensuring realistic and consistent data
- Testable components with proper separation of concerns
- Foundation for complex business scenario generation and testing
- Maintainable codebase supporting long-term development and enhancement

**Related Issues**: [LUM-94](https://linear.app/scootr-ca/issue/LUM-94) - Comprehensive Demo Data Enhancement

---

## ADR-026: Complementary Color Palette Enhancement

**Date**: September 20, 2025  
**Status**: Accepted  
**Context**: Existing Lumina brand colors (Gold #FFD25A, Coral #FF7A5A, Deep Teal #0B2B33) needed complementary colors to provide sufficient variety while maintaining brand consistency and professional appearance.

**Decision**: Add complementary color palette including Sage Green (#87A96B), Warm Gray (#8B8680), Lavender Mist (#C8B5D1), and Cream (#F7F5F0) to enhance the existing Lumina brand colors.

**Rationale**:

- Provides additional color options while maintaining brand harmony
- Sage Green complements warm gold/coral palette with natural balance
- Warm Gray offers sophisticated neutral for enhanced typography hierarchy
- Lavender Mist enhances existing Clarity Blue palette
- Cream provides warmer alternative to pure white for backgrounds
- All colors work harmoniously in both light and dark themes

**Alternatives Considered**:

1. **Stick with existing colors only**: Use only current Lumina brand colors
   - Rejected: Insufficient variety for complex UI needs and professional appearance
2. **Add high-contrast colors**: Include bright, contrasting colors
   - Rejected: Would conflict with sophisticated brand identity and professional appearance
3. **Use generic color palette**: Add standard UI colors without brand consideration
   - Rejected: Would dilute brand identity and visual consistency

**Impact**:

- Enhanced design flexibility while maintaining brand consistency
- Improved visual hierarchy and user interface sophistication
- Better support for complex UI patterns and information architecture
- Maintains professional appearance expected for world-class SaaS platform
- Provides foundation for scalable color system evolution

**Related Issues**: Design system enhancement and brand consistency requirements

---

## ADR-030: Client Communication and Loyalty System Architecture

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: Comprehensive demo data enhancement required realistic client communication tracking, review management, and loyalty program implementation to showcase customer relationship management capabilities and demonstrate platform's marketing and retention features.

**Decision**: Implement comprehensive client communication and loyalty system with ClientReview model for feedback management, CommunicationHistory model for multi-channel tracking, enhanced loyalty program with tier-based rewards, and integrated marketing campaign system with engagement analytics.

**Rationale**:

- Demonstrates complete customer relationship management capabilities essential for salon business success
- Provides realistic engagement metrics (25% email, 85% SMS open rates) matching industry standards
- Creates foundation for testing marketing automation and customer retention features
- Enables comprehensive analytics and reporting for business intelligence demonstration
- Supports multi-channel communication tracking essential for modern salon operations
- Implements tier-based loyalty system with realistic point earning and redemption patterns

**Alternatives Considered**:

1. **Basic review system only**: Implement only client reviews without communication tracking
   - Rejected: Incomplete demonstration of customer relationship management capabilities
2. **External communication simulation**: Mock communication data without database integration
   - Rejected: Poor integration with existing appointment and client data, limited demonstration value
3. **Simplified loyalty program**: Basic points system without tiers or comprehensive tracking
   - Rejected: Insufficient demonstration of advanced loyalty program capabilities expected in modern salon software

**Impact**:

- Complete customer relationship management demonstration enabling effective sales presentations
- Realistic communication and engagement data supporting marketing feature validation
- Comprehensive loyalty program showcasing customer retention capabilities
- Foundation for testing complex customer journey scenarios and marketing automation
- Enhanced user evaluation experience with complete customer lifecycle visibility
- Database schema extensions supporting future CRM and marketing feature development

**Related Issues**: [LUM-94](https://linear.app/scootr-ca/issue/LUM-94) - Comprehensive Demo Data Enhancement

---

## ADR-031: Analytics Data Quality Validation Architecture

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: Comprehensive demo data enhancement requires robust validation system to ensure analytics and reporting data quality for sales demonstrations and user evaluations with production-scale seed data (405+ clients, 58 staff, 272 services, 2046+ appointments).

**Decision**: Implement multi-layered analytics validation system with basic mock data tests, database integration tests, API endpoint validation, automated quality assessment script, and comprehensive documentation for continuous data quality assurance.

**Rationale**:

- Ensures dashboard widgets display meaningful, accurate data essential for effective sales demonstrations
- Validates mathematical accuracy of analytics calculations against known seed data values
- Provides automated quality assessment with performance benchmarks and scoring system
- Enables continuous validation of data quality as seed data evolves and expands
- Supports production-ready analytics with sub-5 second response time requirements
- Creates foundation for regression testing of analytics features during development

**Alternatives Considered**:

1. **Manual validation only**: Human verification of analytics data quality through dashboard inspection
   - Rejected: Not scalable, error-prone, time-consuming, and insufficient for comprehensive validation
2. **Simple unit tests only**: Basic tests without integration, performance, or cross-widget validation
   - Rejected: Insufficient for validating complex analytics calculations and data relationships
3. **External validation service**: Third-party data quality validation and monitoring
   - Rejected: Adds complexity, cost, and doesn't integrate with existing test infrastructure

**Impact**:

- Guaranteed data quality for all dashboard widgets and reporting features with 19+ validation tests
- Automated validation of revenue patterns, client retention metrics, staff performance, and service analytics
- Performance validation ensuring sub-5 second response times for all analytics queries
- Quality scoring system (Excellent/Good/Fair/Poor) with detailed recommendations and troubleshooting
- Comprehensive test coverage enabling confident sales demonstrations and user evaluations
- Foundation for continuous integration testing of analytics features and data quality regression prevention

**Related Issues**: [LUM-94](https://linear.app/scootr-ca/issue/LUM-94) - Comprehensive Demo Data Enhancement

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

## ADR-043: CSS-in-JS Hybrid Architecture for Bulletproof Component Visibility

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

## ADR-044: WCAG AAA+ Accessibility Excellence as Design System Standard

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

## ADR-045: Comprehensive Audit Methodology for Project Assessment

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

## ADR-046: Production Readiness Linear Issue Creation Strategy

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

**Last Updated**: September 21, 2025  
**Next Review**: December 21, 2025

---

## ADR-029: Comprehensive Lumina Audit Implementation Strategy

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

- Complete understanding of project status with 75-80% MVP completion identified
- Clear identification of appointment system as critical MVP blocker (0% complete)
- Strategic development plan with realistic timelines and resource allocation
- Comprehensive Linear issue organization with proper dependencies and labeling
- Foundation for efficient development workflow and project management

**Related Issues**: [LUM-92](https://linear.app/scootr-ca/issue/LUM-92) - Appointment System Implementation

---

## ADR-030: Appointment System as Critical MVP Blocker Priority

**Date**: September 20, 2025  
**Status**: Accepted  
**Context**: Comprehensive audit revealed appointment system (0% complete) as the only major missing component for MVP launch, while all other major systems are 90-100% complete.

**Decision**: Prioritize appointment system implementation as critical path with 80% resource allocation, 6-8 week timeline, and strategic focus as primary MVP blocker.

**Rationale**:

- Appointment system is core value proposition for salon management platform
- All other major systems (Authentication, CRM, Services, Financial, Dashboard) are production-ready
- Strategic resource allocation maximizes efficiency and minimizes time to MVP
- Clear critical path enables focused development without distractions
- Business impact analysis shows appointment system as highest priority for user value

**Alternatives Considered**:

1. **Launch MVP without appointment system**: Focus on other features and add appointments later
   - Rejected: Appointment booking is core value proposition and competitive requirement
2. **Simplified appointment system**: Build basic booking functionality only
   - Rejected: Competitive landscape requires comprehensive appointment management
3. **Equal priority across all remaining tasks**: Distribute effort across multiple areas
   - Rejected: Dilutes focus and extends timeline without proportional value

**Impact**:

- Clear development focus with 80% effort allocation to appointment system
- Strategic timeline of 6-8 weeks for MVP completion
- Resource optimization and efficient development workflow
- Clear success criteria and milestone tracking
- Foundation for competitive salon management platform

**Related Issues**: [LUM-92](https://linear.app/scootr-ca/issue/LUM-92) - Appointment System Implementation

---

## ADR-031: Linear Issue Breakdown Strategy for Complex Epics

**Date**: September 20, 2025  
**Status**: Accepted  
**Context**: Large appointment system epic (LUM-92) needed to be broken down into manageable development tasks with clear dependencies, proper labeling, and realistic time estimates.

**Decision**: Create 6 detailed sub-issues with clear dependencies, proper Linear labeling, and realistic time estimates totaling 34 points over 6-8 weeks.

**Rationale**:

- Manageable task sizes (3-8 points) enable efficient development and accurate estimation
- Clear dependencies prevent blocking and enable parallel development where possible
- Proper Linear labeling enables efficient project management and filtering
- Realistic time estimates based on complexity analysis improve planning accuracy
- Structured approach ensures comprehensive coverage of all epic requirements

**Alternatives Considered**:

1. **Keep as single large epic**: Maintain appointment system as one large task
   - Rejected: Development complexity and tracking difficulties, poor estimation accuracy
2. **Create more granular tasks**: Break down into 15+ smaller tasks
   - Rejected: Management overhead and dependency complexity outweigh benefits
3. **Arbitrary task division**: Split based on time rather than logical functionality
   - Rejected: Creates artificial dependencies and reduces development efficiency

**Impact**:

- Clear development roadmap with logical task progression
- Efficient task management with proper dependency tracking
- Accurate estimation and timeline planning
- Proper Linear project management with labeling and organization
- Foundation for scalable epic breakdown methodology

**Related Issues**: [LUM-92](https://linear.app/scootr-ca/issue/LUM-92) - Appointment System Implementation

---

## ADR-032: Performance Utils Architecture Split for Next.js Compliance

**Date**: September 20, 2025  
**Status**: Accepted  
**Context**: Next.js 14 compilation error due to React hooks in server-side utility file, requiring architectural solution that maintains functionality while ensuring Server/Client Component compliance.

**Decision**: Split performance utilities into server-safe utilities (`lib/performance-utils.ts`) and client-side hooks (`lib/performance-hooks.ts`) with proper 'use client' directive.

**Rationale**:

- Maintains all existing functionality while ensuring Next.js architecture compliance
- Separates concerns between server-safe utilities and client-side React hooks
- Enables proper tree-shaking and bundle optimization
- Follows Next.js best practices for Server/Client Component architecture
- Provides clear separation for future development and maintenance

**Alternatives Considered**:

1. **Add 'use client' to entire file**: Mark entire performance utils file as client-side
   - Rejected: Server-side utility functions don't need client-side execution, impacts performance
2. **Remove React hooks entirely**: Eliminate performance monitoring functionality
   - Rejected: Loss of valuable performance monitoring and optimization capabilities
3. **Conditional imports**: Use dynamic imports to conditionally load hooks
   - Rejected: Adds complexity and potential runtime errors, harder to maintain

**Impact**:

- Resolved Next.js compilation error enabling development server startup
- Maintained all performance monitoring and optimization functionality
- Proper Next.js Server/Client Component architecture compliance
- Clear separation of concerns for future development
- Foundation for scalable utility architecture patterns

**Related Issues**: Build error resolution, Next.js architecture compliance

---

## ADR-033: CSS Class Standardization for Design System Compliance

**Date**: September 20, 2025  
**Status**: Accepted  
**Context**: Invalid Tailwind CSS classes in globals.css causing compilation errors, requiring standardization that maintains design consistency while ensuring build success.

**Decision**: Replace invalid CSS classes (`text-color-foreground-muted`) with proper Tailwind classes (`text-muted-foreground`) following established design system patterns.

**Rationale**:

- Ensures successful CSS compilation and build process
- Maintains design system consistency and visual appearance
- Follows Tailwind CSS best practices and naming conventions
- Enables proper theme switching and design token usage
- Provides foundation for scalable CSS architecture

**Alternatives Considered**:

1. **Create custom CSS classes**: Define custom classes for invalid Tailwind references
   - Rejected: Breaks design system consistency and adds maintenance overhead
2. **Remove styling entirely**: Eliminate problematic styling to fix compilation
   - Rejected: Negative impact on user experience and design consistency
3. **Use inline styles**: Replace CSS classes with inline style attributes
   - Rejected: Reduces maintainability and breaks design system patterns

**Impact**:

- Resolved CSS compilation error enabling successful build process
- Maintained design consistency and user experience
- Proper Tailwind CSS usage following best practices
- Foundation for scalable CSS architecture and design system compliance
- Improved maintainability and development workflow

**Related Issues**: Build error resolution, design system compliance

---

## ADR-034: Complete Design System Page Rebuild Strategy

**Date**: September 20, 2025  
**Status**: Accepted  
**Context**: Design system page had critical rendering issues with unreadable text, broken components, and theme context errors requiring comprehensive solution rather than incremental fixes.

**Decision**: Completely rebuild design system page from scratch with proper ThemeProvider integration, comprehensive component showcase, and professional theme switching capabilities.

**Rationale**:

- Systematic rebuild addresses all root causes rather than symptoms
- Proper ThemeProvider integration eliminates theme context errors
- Comprehensive component showcase provides complete testing coverage
- Professional implementation matches world-class SaaS standards
- Clean architecture provides foundation for future design system maintenance

**Alternatives Considered**:

1. **Incremental fixes**: Fix individual components and styling issues as discovered
   - Rejected: Doesn't address fundamental architecture problems causing widespread issues
2. **Minimal fixes**: Address only the most critical rendering problems
   - Rejected: Leaves underlying problems that will cause future issues
3. **Third-party design system**: Replace with existing design system library
   - Rejected: Doesn't match Lumina brand requirements and loses existing work

**Impact**:

- Complete resolution of design system rendering and styling issues
- Professional theme switching with real-time light/dark mode toggle
- Comprehensive component showcase covering all 50+ UI library components
- Interactive features including color copying and component testing
- Foundation for scalable design system maintenance and enhancement

**Related Issues**: [LUM-102](https://linear.app/scootr-ca/issue/LUM-102) - Design System Critical Issues Audit and Fix

---

## ADR-035: WCAG AAA Compliance for Design System Text Contrast

**Date**: September 20, 2025  
**Status**: Accepted  
**Context**: Widespread text readability issues across design system with light gray text on white backgrounds failing basic accessibility standards and creating poor user experience.

**Decision**: Implement WCAG AAA compliant text contrast ratios throughout design system using proper semantic color hierarchy with `text-neutral-900` (16.94:1 contrast) for headings and `text-neutral-800` (10.4:1 contrast) for descriptions.

**Rationale**:

- Ensures excellent accessibility for all users including those with visual impairments
- WCAG AAA compliance (7:1+ contrast) exceeds minimum requirements for superior user experience
- Systematic approach prevents future contrast issues through proper semantic color usage
- Professional appearance expected for world-class SaaS platform
- Legal compliance and reduced liability through accessibility excellence

**Alternatives Considered**:

1. **WCAG AA compliance only**: Meet minimum 4.5:1 contrast requirements
   - Rejected: Insufficient for superior user experience and professional appearance
2. **Component-specific fixes**: Fix contrast issues individually as discovered
   - Rejected: Doesn't address systematic color usage problems
3. **High contrast mode toggle**: Provide separate accessibility mode
   - Rejected: Adds complexity and doesn't address core design issues

**Impact**:

- All text throughout design system now meets WCAG AAA standards
- Significantly improved readability and user experience for all users
- Professional appearance matching enterprise-level SaaS platforms
- Foundation for accessibility excellence throughout entire application
- Reduced legal liability and compliance risk

**Related Issues**: [LUM-102](https://linear.app/scootr-ca/issue/LUM-102) - Design System Critical Issues Audit and Fix

---

## ADR-036: Comprehensive Component Showcase Architecture

**Date**: September 20, 2025  
**Status**: Accepted  
**Context**: Design system needed comprehensive component testing and demonstration capabilities to ensure all UI library components work correctly and provide developer reference.

**Decision**: Implement comprehensive component showcase covering all 50+ UI library components with interactive examples, theme demonstrations, and professional documentation.

**Rationale**:

- Provides complete testing coverage for all components in both light and dark themes
- Interactive examples enable thorough component validation and debugging
- Professional documentation improves developer experience and component adoption
- Comprehensive coverage prevents component issues from going unnoticed
- Establishes foundation for design system governance and quality assurance

**Alternatives Considered**:

1. **Basic component examples**: Show only essential components with minimal examples
   - Rejected: Insufficient coverage for comprehensive design system validation
2. **Separate testing pages**: Create individual pages for each component category
   - Rejected: Fragmented experience and maintenance overhead
3. **Third-party documentation tools**: Use Storybook or similar tools
   - Rejected: Additional complexity and doesn't integrate with existing architecture

**Impact**:

- Complete component testing coverage with interactive examples
- Professional documentation improving developer experience
- Foundation for design system quality assurance and governance
- Interactive features including color copying and component validation
- Scalable architecture for future component additions and enhancements

**Related Issues**: [LUM-102](https://linear.app/scootr-ca/issue/LUM-102) - Design System Critical Issues Audit and Fix

---

## ADR-037: Custom Theme Provider Over Third-Party Dependencies

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: During design system testing, discovered import error where design system page was trying to import `useTheme` from `next-themes` package which is not installed, while project has existing custom theme provider.

**Decision**: Use existing custom `ThemeProvider` and `useTheme` hook from `@/components/theme-provider` instead of adding `next-themes` dependency.

**Rationale**:

- Existing custom theme provider is well-tested with comprehensive functionality
- Custom implementation provides better control over theme behavior and integration
- Avoids adding unnecessary external dependency for functionality we already have
- Custom provider includes advanced features like transition states, system theme detection, and proper SSR handling
- Maintains consistency with existing codebase architecture

**Alternatives Considered**:

1. **Install next-themes package**: Add external dependency to match import
   - Rejected: Unnecessary duplication of existing functionality
2. **Refactor to use next-themes throughout**: Replace custom provider with next-themes
   - Rejected: Would break existing theme functionality and require extensive refactoring
3. **Create wrapper around next-themes**: Maintain custom API while using next-themes internally
   - Rejected: Adds complexity without benefits

**Impact**:

- Resolved compilation error preventing design system page from loading
- Maintains existing theme functionality and API consistency
- Preserves well-tested custom theme implementation
- Avoids dependency bloat and potential version conflicts
- Ensures consistent theme behavior across all components

**Related Issues**: [LUM-102](https://linear.app/scootr-ca/issue/LUM-102) - Design System Critical Issues Audit and Fix---

## ADR-038: React Context Component Hierarchy for Theme Providers

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: During design system testing, encountered runtime error where components using `useTheme()` hook were defined outside the `ThemeProvider` context, causing "useTheme must be used within a ThemeProvider" error.

**Decision**: Restructure component hierarchy to ensure all components using React context hooks are rendered within their respective provider components, using wrapper component pattern for proper context access.

**Rationale**:

- React context hooks can only be used within components that are rendered inside the provider
- Component definition location doesn't matter, but render location within provider tree is critical
- Wrapper component pattern provides clean separation between provider setup and content components
- Follows React best practices for context usage and component composition
- Prevents runtime context errors and improves debugging experience

**Alternatives Considered**:

1. **Move hook usage to parent component**: Pass theme values as props instead of using context
   - Rejected: Breaks component encapsulation and increases prop drilling
2. **Conditional hook usage**: Check if context exists before using hook
   - Rejected: Violates Rules of Hooks and creates unpredictable behavior
3. **Global theme state**: Use external state management instead of React context
   - Rejected: Adds unnecessary complexity for theme management

**Impact**:

- Resolved runtime context error preventing design system page from loading
- Established proper React context usage pattern for future components
- Improved component architecture with clear provider/consumer separation
- Better debugging experience with proper error boundaries
- Foundation for scalable context usage throughout application

**Related Issues**: [LUM-102](https://linear.app/scootr-ca/issue/LUM-102) - Design System Critical Issues Audit and Fix---

## A

DR-039: File Corruption Prevention and Clean Code Architecture

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: During design system testing, encountered severe file corruption with malformed JSX, orphaned attributes, and syntax errors caused by incomplete cleanup operations and file editing issues.

**Decision**: Implement complete file rebuild approach for corrupted files rather than incremental fixes, establishing clean code architecture patterns to prevent future corruption.

**Rationale**:

- Corrupted files with syntax errors require systematic rebuild rather than piecemeal fixes
- Clean file structure prevents cascading issues and improves maintainability
- Complete rebuild ensures proper React component patterns and TypeScript compliance
- Systematic approach addresses root causes rather than symptoms
- Establishes foundation for reliable file structure and development workflow

**Alternatives Considered**:

1. **Incremental syntax fixes**: Fix individual syntax errors as discovered
   - Rejected: Doesn't address underlying file corruption and leaves potential issues
2. **Partial file cleanup**: Remove only the most problematic sections
   - Rejected: Risk of leaving hidden corruption that causes future issues
3. **Revert to previous version**: Use git to restore earlier working version
   - Rejected: Would lose recent improvements and fixes already implemented

**Impact**:

- Resolved all syntax errors and compilation issues
- Established clean, maintainable file structure following React best practices
- Improved development workflow with reliable file architecture
- Prevention of future file corruption through systematic approach
- Foundation for scalable component development and maintenance

**Prevention Measures**:

- Use proper file editing tools and techniques to prevent corruption
- Implement systematic cleanup procedures for large file modifications
- Regular validation of file syntax and structure during development
- Proper version control practices to enable recovery from corruption

**Related Issues**: [LUM-102](https://linear.app/scootr-ca/issue/LUM-102) - Design System Critical Issues Audit and Fix---

## ADR-040: Global Theme Provider Architecture Pattern

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: During design system testing, discovered nested ThemeProvider conflict where page-level ThemeProvider was conflicting with existing root-level ThemeProvider, causing persistent React context errors.

**Decision**: Use single global ThemeProvider at application root level rather than page-specific theme providers, ensuring all pages inherit theme context from root provider.

**Rationale**:

- React context providers cannot be nested with same context type without conflicts
- Global theme state ensures consistent theme behavior across entire application
- Single source of truth for theme management reduces complexity and potential conflicts
- Root-level provider automatically available to all pages and components
- Eliminates need for page-specific theme provider setup

**Alternatives Considered**:

1. **Page-specific theme providers**: Each page manages its own theme context
   - Rejected: Causes nesting conflicts and inconsistent theme state across application
2. **Multiple theme contexts**: Create separate theme contexts for different areas
   - Rejected: Adds unnecessary complexity and doesn't solve the core architecture issue
3. **Conditional theme providers**: Only provide theme context when needed
   - Rejected: Creates inconsistent developer experience and potential runtime errors

**Impact**:

- Resolved persistent React context nesting conflicts
- Established consistent theme behavior across entire application
- Simplified theme management with single global provider
- Improved developer experience with predictable theme context availability
- Foundation for scalable theme architecture across all application areas

**Architecture Pattern**:

```typescript
// ✅ Correct: Global theme provider at root
// app/layout.tsx → components/providers.tsx
<ThemeProvider defaultTheme="system" storageKey="lumina-theme">
  <SessionProvider>
    {children} // All pages inherit theme context
  </SessionProvider>
</ThemeProvider>

// ✅ Correct: Pages use inherited context
export default function Page() {
  return <PageContent />; // No additional ThemeProvider needed
}

function PageContent() {
  const { theme, setTheme } = useTheme(); // ✅ Works - inherits from root
  return <div>Content</div>;
}
```

## **Related Issues**: [LUM-102](https://linear.app/scootr-ca/issue/LUM-102) - Design System Critical Issues Audit and Fix--

## ADR-041: React Context Provider SSR/Hydration Safety Pattern

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: During design system testing, discovered that custom ThemeProvider had flawed SSR/hydration logic where children were rendered outside the context provider during mounting phase, causing persistent "useTheme must be used within a ThemeProvider" errors.

**Decision**: Always wrap children with React context provider, handling mounting state and hydration safety inside the provider rather than conditionally rendering the provider itself.

**Rationale**:

- React context must be available before any child components attempt to use it
- SSR and hydration phases require consistent context availability
- Mounting state management should not affect context provider availability
- Conditional provider rendering creates timing issues where hooks are called before context exists
- Hydration mismatch prevention can be handled inside provider without breaking context

**Alternatives Considered**:

1. **Conditional provider rendering**: Only render provider after mounting
   - Rejected: Creates timing gap where children render before context is available
2. **Lazy context initialization**: Initialize context only when first accessed
   - Rejected: Violates React hooks rules and creates unpredictable behavior
3. **Fallback context values**: Provide default values during mounting
   - Rejected: Can cause inconsistent behavior and doesn't solve root timing issue

**Impact**:

- Resolved persistent React context availability errors during SSR/hydration
- Established reliable pattern for context providers in Next.js applications
- Improved SSR compatibility while maintaining hydration mismatch prevention
- Foundation for reliable context usage across all application components
- Better developer experience with predictable context behavior

**Implementation Pattern**:

```typescript
// ✅ Correct: Always provide context, handle mounting inside
export function ThemeProvider({ children, ...props }) {
  const [mounted, setMounted] = useState(false);

  // ... theme logic

  const contextValue = { theme, setTheme, resolvedTheme, isTransitioning };

  return (
    <ThemeContext.Provider value={contextValue}>
      {!mounted ? (
        <div style={{ visibility: 'hidden' }}>
          {children} {/* ✅ Always inside context */}
        </div>
      ) : (
        children {/* ✅ Always inside context */}
      )}
    </ThemeContext.Provider>
  );
}

// ❌ Incorrect: Conditional provider rendering
export function ThemeProvider({ children, ...props }) {
  const [mounted, setMounted] = useState(false);

  if (!mounted) {
    return <div>{children}</div>; // ❌ Outside context
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children} // ✅ Inside context, but too late
    </ThemeContext.Provider>
  );
}
```

**Related Issues**: [LUM-102](https://linear.app/scootr-ca/issue/LUM-102) - Design System Critical Issues Audit and Fix---

## ADR-042: Semantic Tailwind Classes for Theme-Adaptive Design Systems

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: During design system testing, discovered critical accessibility issues where theme-specific classes (`text-neutral-900`) caused light text on light backgrounds, failing WCAG standards and creating poor user experience across theme switching.

**Decision**: Use semantic Tailwind CSS classes (`text-foreground`, `text-muted-foreground`, `bg-background`) instead of specific color classes for theme-adaptive components, ensuring proper contrast ratios in both light and dark themes.

**Rationale**:

- Semantic classes automatically adapt to theme changes without manual intervention
- Ensures consistent contrast ratios across all theme variations
- Eliminates accessibility issues caused by theme-specific color classes
- Reduces maintenance overhead by centralizing theme color definitions
- Provides better developer experience with predictable color behavior
- Prevents hydration mismatches between SSR and client rendering

**Alternatives Considered**:

1. **Manual theme-specific classes**: Use conditional classes based on theme state
   - Rejected: Complex implementation, prone to errors, maintenance overhead
2. **CSS custom properties**: Define theme colors as CSS variables
   - Rejected: Already implemented in Tailwind semantic classes, would duplicate effort
3. **Theme-aware utility functions**: Create functions to return appropriate classes
   - Rejected: Adds complexity without benefits over semantic classes

**Impact**:

- Resolved critical accessibility issues with automatic proper contrast ratios
- Eliminated light text on light background problems across all themes
- Improved developer experience with predictable color behavior
- Reduced maintenance overhead for theme-related styling
- Enhanced accessibility compliance with WCAG AAA standards
- Better SSR/client rendering consistency

**Implementation Pattern**:

```typescript
// ✅ Correct: Semantic classes that adapt to themes
<h1 className="text-foreground">Heading</h1>
<p className="text-muted-foreground">Description</p>
<div className="bg-background border border-border">Content</div>

// ❌ Incorrect: Theme-specific classes
<h1 className="text-neutral-900 dark:text-neutral-100">Heading</h1>
<p className="text-neutral-600 dark:text-neutral-400">Description</p>
<div className="bg-white dark:bg-neutral-900">Content</div>

// ✅ Semantic class mapping in Tailwind config
module.exports = {
  theme: {
    extend: {
      colors: {
        foreground: 'hsl(var(--foreground))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        background: 'hsl(var(--background))',
        // ... other semantic colors
      }
    }
  }
}
```

**Related Issues**: [LUM-102](https://linear.app/scootr-ca/issue/LUM-102) - Design System Critical Issues Audit and Fix

## ADR-028: Enhanced Batch Processing System for Seed Performance

**Date**: September 21, 2025  
**Status**: Accepted  
**Context**: Seed data generation needed performance optimization for large datasets with memory management, progress tracking, and error handling capabilities to handle production-scale data generation efficiently.

**Decision**: Implement enhanced batch processing system with BatchProcessor class featuring configurable batch sizes, memory monitoring, progress tracking, rollback capabilities, and comprehensive performance monitoring through PerformanceMonitor class.

**Rationale**:

- Enables efficient processing of large datasets (500+ appointments, 400+ transactions) without memory issues
- Provides real-time progress tracking and performance metrics for better user experience
- Implements graceful error handling with rollback capabilities to prevent data corruption
- Offers configurable batch sizes and concurrency limits for optimal performance tuning
- Includes comprehensive memory management with automatic garbage collection triggers
- Supports streaming operations for extremely large datasets with memory-efficient processing

**Alternatives Considered**:

1. **Simple batch processing**: Basic batching without performance monitoring or rollback
   - Rejected: Insufficient for production-scale data generation and lacks error recovery
2. **Third-party batch processing library**: Use external library for batch operations
   - Rejected: Additional dependency and may not integrate well with Prisma and multi-tenant architecture
3. **Database-level batch operations**: Rely on database batch insert capabilities
   - Rejected: Limited error handling, progress tracking, and doesn't support complex business logic validation

**Impact**:

- Dramatically improved seed performance with thousands of items processed per second
- Enhanced reliability through comprehensive error handling and rollback capabilities
- Better user experience with real-time progress tracking and ETA calculations
- Scalable foundation for handling production-scale data generation requirements
- Comprehensive performance monitoring enabling optimization and troubleshooting
- Memory-efficient processing preventing out-of-memory issues during large data generation

**Related Issues**: [LUM-94](https://linear.app/scootr-ca/issue/LUM-94) - Comprehensive Demo Data Enhancement

---
