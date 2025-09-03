# AI Context Guide

This guide provides essential context for AI assistants working on Lumina. Review these documents to understand the current project state and maintain continuity across sessions.

## Essential Reading (5-10 minutes)

### Core Project Context
- [ ] [Project Overview](./PROJECT_OVERVIEW.md) - Current state and active features
- [ ] [Product Overview](./../.kiro/steering/product.md) - Lumina's mission and target users
- [ ] [Technology Stack](./../.kiro/steering/tech.md) - Core technologies and tools
- [ ] [Project Structure](./../.kiro/steering/structure.md) - Directory organization and conventions

### Current Development Status
- [ ] [Recent Decision Log](./DECISION_LOG.md) - Last 30 days of architectural decisions
- [ ] [Latest Daily Status](../project-management/) - Most recent development progress
- [ ] [Active Linear Issues](https://linear.app/lumina-product) - Current work items and blockers

### Development Standards
- [ ] [Coding Standards](./../.kiro/steering/coding-approach-and-standards.md) - Development guidelines and patterns
- [ ] [Security Standards](./../.kiro/steering/security.md) - Security requirements and patterns
- [ ] [API Standards](./../.kiro/steering/api-standards.md) - RESTful API design patterns

## Deep Context (15-30 minutes)

### Feature Documentation
- [ ] [Completed Features](../features/) - Implemented functionality and patterns
- [ ] [Feature Specifications](./../.kiro/specs/) - Detailed requirements and designs
- [ ] [API Documentation](../api/) - Endpoint specifications and usage

### Technical Architecture
- [ ] [Database Schema](../../prisma/schema.prisma) - Data models and relationships
- [ ] [Authentication System](../../lib/auth.ts) - Auth patterns and permissions
- [ ] [Multi-tenant Architecture](../features/multi-tenancy/) - Business scoping patterns

### Quality Assurance
- [ ] [Testing Strategy](../testing/) - Test patterns and coverage requirements
- [ ] [Troubleshooting Guide](./../.kiro/steering/troubleshooting.md) - Common issues and solutions
- [ ] [Development Setup](../DEVELOPMENT_SETUP.md) - Local environment configuration

## Context Validation Checklist

Before starting work, ensure you understand:

### Project State
- [ ] What features are currently in development?
- [ ] What are the active blockers or issues?
- [ ] What was the last major architectural decision?
- [ ] What is the current deployment status?

### Technical Context
- [ ] What is the multi-tenant architecture pattern?
- [ ] How is authentication and authorization handled?
- [ ] What are the current database schema patterns?
- [ ] What testing patterns should be followed?

### Development Context
- [ ] What coding standards must be followed?
- [ ] What is the current Git workflow?
- [ ] How should Linear issues be managed?
- [ ] What documentation standards apply?

## Quick Reference

### Key Commands
```bash
npm run dev              # Start development server (if not running)
npm run type-check       # Validate TypeScript
npm run lint             # Check code quality
npm run test             # Run unit tests
npm run db:studio        # Open database management
```

### Important Paths
- `/app/` - Next.js App Router pages and API routes
- `/components/` - Reusable UI components
- `/lib/` - Utility functions and configurations
- `/prisma/` - Database schema and migrations
- `/docs/` - Project documentation
- `/.kiro/` - Kiro configuration and specifications

### Emergency Contacts
- Check [Troubleshooting Guide](./../.kiro/steering/troubleshooting.md) for common issues
- Review [Linear Issues](https://linear.app/lumina-product) for active problems
- Check recent [Daily Status](../project-management/) for context on current work

## Session Initialization Template

Use this template when starting a new AI session:

```markdown
## Session Context Review - [DATE]

### Essential Documents Reviewed
- [ ] Project Overview - Current state understood
- [ ] Recent Decisions - Last 30 days reviewed
- [ ] Active Issues - Current blockers identified
- [ ] Development Standards - Guidelines confirmed

### Current Understanding
- Active Features: [List current development items]
- Recent Decisions: [Key architectural choices]
- Current Blockers: [Any impediments to progress]
- Next Priorities: [Planned work items]

### Context Completeness Score: [0-100]%
- Essential Reading: [X/7 items completed]
- Deep Context: [X/9 items completed]
- Validation Checklist: [X/16 items confirmed]

### Recommended Next Steps
1. [Priority action based on current state]
2. [Secondary action or investigation needed]
3. [Documentation or follow-up required]
```

## Maintenance Schedule

This guide should be updated:
- **Weekly**: Review and update project state references
- **After major decisions**: Add new architectural decisions to essential reading
- **After feature completion**: Update feature documentation references
- **Monthly**: Validate all links and document availability

Last Updated: [DATE]
Next Review Due: [DATE + 1 week]