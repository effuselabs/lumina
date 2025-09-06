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
**Context**: The documentation audit spec (`.kiro/specs/documentation-audit-plan/`) was created to manage comprehensive documentation cleanup and migration. However, during development, we discovered that the audit scripts have critical safety issues and the documentation system is already in good shape after manual cleanup efforts.

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

**Last Updated**: September 4, 2025  
**Next Review**: October 4, 2025
