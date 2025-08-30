# Lumina Documentation

Welcome to the Lumina documentation hub. This directory contains comprehensive documentation for the Lumina platform development and usage.

## 📋 Quick Navigation

### Getting Started
- **[Development Setup](DEVELOPMENT_SETUP.md)** - Complete local development environment setup
- **[Git Workflow](GIT_WORKFLOW.md)** - Branching strategy and development process

### Technical Documentation
- **[Authentication System](AUTHENTICATION.md)** - Multi-tenant auth and permissions system
- **[Testing Guide](TESTING.md)** - Testing framework, best practices, and usage
- **[Deployment Guide](DEPLOYMENT.md)** - CI/CD pipeline and deployment processes

### Workflow Automation
- **[Agent Hook Workflows](AGENT_HOOK_WORKFLOWS.md)** - Complete documentation sync and compliance automation
- **[Hybrid Business Model Guide](HYBRID_BUSINESS_MODEL_GUIDE.md)** - Implementation guide for commission, chair rental, and hybrid employment models
- **[Linear Integration Training](LINEAR_INTEGRATION_TRAINING.md)** - Training materials for enhanced Linear project management
- **[Workflow Troubleshooting Guide](WORKFLOW_TROUBLESHOOTING_GUIDE.md)** - Comprehensive troubleshooting for workflow automation

### Project Management
- **[Development Plan](DEVELOPMENT_PLAN.md)** - Technical architecture and development roadmap
- **[Brand Guidelines](LUMINA_PRODUCT_STYLEGUIDE.md)** - Design system and UI guidelines
- **[Rollback Procedures](ROLLBACK_PROCEDURES.md)** - Emergency rollback and recovery procedures

## 🏗️ Architecture Overview

Lumina is built as a modern, scalable SaaS platform with the following key components:

- **Frontend**: Next.js 14 with App Router and TypeScript
- **Backend**: Next.js API routes with Prisma ORM
- **Database**: PostgreSQL with multi-tenant architecture
- **Authentication**: NextAuth.js v5 with role-based access control
- **Styling**: Tailwind CSS with custom Lumina design system
- **Testing**: Jest, React Testing Library, and Playwright
- **Deployment**: Railway with GitHub Actions CI/CD

## 🚀 Development Status

### ✅ Completed (Foundation Phase)
- Project foundation and development environment
- Database architecture with comprehensive schema
- Authentication system with multi-tenant support
- UI design system with Lumina branding
- CI/CD pipeline with automated deployment
- Testing framework with comprehensive coverage
- **Workflow integration system** with Agent Hooks for documentation sync and steering compliance
- **Documentation audit** with comprehensive steering system integration
- **Hybrid employment model** database architecture and financial calculation engine
- **Production deployment infrastructure** with zero-downtime migration support

### 🚧 In Development
- Business onboarding and profile management
- Service management CRUD operations
- Client data import system

### 📋 Planned (MVP Phase)
- Booking engine with real-time availability
- Client relationship management (CRM)
- Point of sale (POS) system
- Financial reporting and analytics
- Staff management and permissions

## 🎯 AI-Powered Development Guidance

Lumina includes a comprehensive **Steering System** that provides automatic, context-aware development guidance:

### How It Works
- **File Pattern Matching**: Different rules apply automatically based on what you're working on
- **Security Standards**: Auto-applied to API routes, auth files, and middleware
- **API Standards**: Auto-applied to all API route files for consistent RESTful design
- **Database Standards**: Auto-applied to Prisma files for multi-tenant data patterns
- **UI Standards**: Auto-applied to React components for design system compliance

### Key Benefits
- **Consistent Code Quality**: All developers follow the same patterns automatically
- **Security First**: Built-in security guidelines prevent common vulnerabilities
- **Multi-Tenant Architecture**: Enforces business-scoped data access patterns
- **Best Practices**: Incorporates industry standards for SaaS development

**[📖 Complete Steering System Guide](../.kiro/steering/README.md)** - Learn how to leverage automated guidance

## 📚 Documentation Standards

All documentation follows these standards:

- **Markdown Format**: All docs use GitHub-flavored Markdown
- **Cross-References**: Related documents are linked for easy navigation
- **Code Examples**: Include practical, working code examples
- **Up-to-Date**: Documentation is updated with each feature release
- **Accessibility**: Clear headings and structure for screen readers
- **Steering Integration**: Technical docs reference appropriate steering files

## 🔄 Keeping Documentation Current

Documentation is maintained as part of the development process:

### Development Integration
1. **Feature Development**: Update relevant docs when implementing features
2. **Code Reviews**: Include documentation updates in pull requests
3. **Release Process**: Update changelog and version documentation
4. **Steering Updates**: Update steering files when patterns change

### Quality Assurance
- **Link Validation**: Check internal links during PR reviews
- **Content Accuracy**: Verify technical instructions work as documented
- **Steering Integration**: Ensure new technical docs reference appropriate steering files
- **Regular Audits**: Quarterly comprehensive documentation review

### Maintenance Schedule
- **Weekly**: Review and merge documentation PRs
- **Monthly**: Check for broken links and outdated content
- **Quarterly**: Full documentation audit using [audit checklist](../.kiro/specs/documentation-audit-plan/audit-checklist.md)
- **Release**: Update all version-specific information

## 🤝 Contributing to Documentation

When contributing to documentation:

1. Follow the existing structure and formatting
2. Include practical examples and code snippets
3. Update cross-references when adding new documents
4. Test all links and code examples
5. Use clear, concise language

## 📞 Support

For questions about the documentation or development process:

- **GitHub Issues**: For bugs or feature requests
- **Linear Project**: For project management and task tracking
- **Team Communication**: Internal team channels

---

**Last Updated**: January 27, 2025  
**Version**: 0.2.0  
**Status**: Foundation Phase Complete