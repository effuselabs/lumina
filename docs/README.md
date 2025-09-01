# Lumina Documentation

Welcome to the Lumina documentation hub. This directory contains comprehensive documentation for the Lumina platform development and usage.

## 📋 Quick Navigation

### Getting Started

- **[Development Setup](DEVELOPMENT_SETUP.md)** - Complete local development environment setup
- **[Git Workflow](project-management/GIT_WORKFLOW.md)** - Branching strategy and development process

### 🎯 Features & Implementation

- **[Features Documentation](features/)** - Feature-specific implementation docs
  - [Authentication System](features/authentication/AUTHENTICATION.md) - NextAuth.js implementation
  - [Booking Engine](features/booking-system/BOOKING_SYSTEM_IMPLEMENTATION.md) - Complete booking system
  - [CRM & Staff Management](features/crm-staff-management/) - Staff and client management

### 🧪 Testing & Quality

- **[Testing Documentation](testing/)** - Comprehensive testing guides
  - [Testing Strategy](testing/TESTING_STRATEGY.md) - Complete testing checklist
  - [Testing Guidelines](testing/README.md) - General testing practices

### 📊 Project Management

- **[Project Management Hub](project-management/)** - Workflow and project management
  - [Linear Integration](project-management/LINEAR_INTEGRATION.md) - Linear workflow and integration
  - [Git Workflow](project-management/GIT_WORKFLOW.md) - Branching strategy and development process
  - [Issue Templates](project-management/templates/) - Standardized Linear issue templates

### 🏗️ Architecture & Operations

- **[Development Plan](DEVELOPMENT_PLAN.md)** - Technical architecture and development roadmap
- **[Deployment Guide](DEPLOYMENT.md)** - CI/CD pipeline and deployment processes
- **[Rollback Procedures](ROLLBACK_PROCEDURES.md)** - Emergency rollback and recovery procedures

### 🎨 Design & Brand

- **[Brand Guidelines](LUMINA_PRODUCT_STYLEGUIDE.md)** - Design system and UI guidelines

### 🤖 Workflow Automation

- **[Agent Hook Workflows](AGENT_HOOK_WORKFLOWS.md)** - Complete documentation sync and compliance automation
- **[Hybrid Business Model Guide](HYBRID_BUSINESS_MODEL_GUIDE.md)** - Implementation guide for commission, chair rental, and hybrid employment models
- **[Workflow Troubleshooting Guide](WORKFLOW_TROUBLESHOOTING_GUIDE.md)** - Comprehensive troubleshooting for workflow automation

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
- **Business management system** with onboarding, service management, and client import
- **Booking engine** with public interface, staff availability management, and email notifications
- **Client relationship management (CRM) system** with comprehensive client profiles, advanced search/filtering, and appointment history
- **Workflow integration system** with Agent Hooks for documentation sync and steering compliance
- **Documentation audit** with comprehensive steering system integration
- **Hybrid employment model** database architecture and financial calculation engine
- **Production deployment infrastructure** with zero-downtime migration support

### 🚧 In Development

- Staff management and invitation system
- Payment processing and financial system

### 📋 Planned (MVP Phase)

- Point of sale (POS) system
- Financial reporting and analytics
- Dashboard and analytics foundation
- Performance optimization and security hardening

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

## 📚 Documentation Standards & Maintenance

### Quality Assurance
- **[Documentation Standards](DOCUMENTATION_STANDARDS.md)** - Style guide and formatting standards
- **[Documentation Maintenance](DOCUMENTATION_MAINTENANCE.md)** - Maintenance schedule and procedures
- **[Comprehensive Review](DOCUMENTATION_COMPREHENSIVE_REVIEW.md)** - Latest documentation audit results

### Maintenance Schedule
- **Weekly**: Linear issue updates and link validation
- **Monthly**: Cross-reference audit and feature status updates  
- **Quarterly**: Comprehensive documentation review and structure assessment

---

**Last Updated**: January 9, 2025  
**Version**: 0.3.0  
**Status**: Foundation Phase Complete + CRM System Operational + Documentation Reorganized
