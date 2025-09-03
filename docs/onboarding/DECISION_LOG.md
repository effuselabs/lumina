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

**Date**: November 15, 2024  
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

**Date**: November 20, 2024  
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

**Date**: November 10, 2024  
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

**Date**: January 5, 2025  
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

**Date**: December 10, 2024  
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

**Date**: October 25, 2024  
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

**Last Updated**: January 9, 2025  
**Next Review**: February 9, 2025