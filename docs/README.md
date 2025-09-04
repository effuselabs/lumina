# Lumina Documentation

> **Comprehensive documentation for the Lumina V-SaaS platform**

## 📚 **Documentation Structure**

### **🚀 Getting Started**
- [Project Overview](project-overview.md) - Current project status and overview
- [Development Setup](development-setup.md) - How to set up the development environment
- [Contributing Guidelines](../CONTRIBUTING.md) - How to contribute to the project

### **🏗️ Architecture & Features**
- [API Documentation](api/README.md) - REST API endpoints and schemas
- [Feature Documentation](features/README.md) - Individual feature guides
- [Authentication System](features/authentication/README.md) - How authentication works

### **🎨 Design & Brand**
- [Design System](design-system/README.md) - Complete design system documentation
- [Lumina Style Guide](design-system/lumina-product-styleguide.md) - Brand guidelines and visual identity
- [UI Components](design-system/README.md#component-library) - Component library and usage

### **🔧 Development & Project Management**
- [Development Plan](project-management/development-plan.md) - Current development roadmap
- [Decision Log](project-management/decision-log.md) - Architectural decisions and rationale
- [Linear Integration Guide](project-management/linear-integration-guide.md) - Project management workflow
- [Quality Automation](project-management/quality-automation.md) - Documentation quality system
- [Daily Status](project-management/daily-status/) - Daily development status updates
- [Templates](project-management/templates/README.md) - Issue and documentation templates
- [Documentation Management](documentation-management/README.md) - Meta-documentation and maintenance

### **⚠️ Important Notices**
- **Script Safety**: Documentation audit scripts in `/scripts/` have critical issues - **DO NOT USE**
- **Linear Issue**: [LUM-78](https://linear.app/scootr-ca/issue/LUM-78) tracks required fixes
- **Details**: See [Documentation Audit Fixes](documentation-management/DOCUMENTATION_AUDIT_FIXES.md)

### **🚀 Deployment & Operations**
- [Deployment Guide](deployment/deployment.md) - How to deploy the application
- [Rollback Procedures](deployment/rollback-procedures.md) - Emergency rollback steps

### **🧪 Testing**
- [Testing Documentation](testing/README.md) - Testing strategy and guidelines
- [Testing Strategy](testing/testing-strategy.md) - Comprehensive testing approach

### **📁 Archive & Migration**
- [Migration Documentation](migration/README.md) - Documentation migration process and results
- [Archived Documents](archive/README.md) - Outdated documentation for reference

## 🎯 **Documentation Philosophy**

This documentation follows a **solo developer workflow** optimized for:
- **Minimal overhead** - Quick to update, easy to maintain
- **AI-friendly** - Structured for AI context loading
- **Decision preservation** - Architectural choices and rationale documented
- **Quality automation** - Automated quality checks and Linear integration

## 🤖 **Kiro IDE Integration**

### **Steering System**
Lumina uses Kiro's intelligent steering system for automated development guidance:
- **Automatic Application**: Coding standards applied based on files you're working on
- **Context-Aware**: Security guidelines for API routes, UI standards for components
- **Comprehensive Coverage**: All development aspects covered with consistent patterns
- **Location**: `.kiro/steering/` - [Steering System Overview](.kiro/steering/README.md)

### **Agent Hooks**
Automated workflows triggered by development events:
- **Documentation Hooks**: Auto-update docs when features are completed
- **Quality Hooks**: Run quality checks on file saves
- **Linear Integration**: Auto-create issues for documentation problems
- **Access**: Use Kiro command palette → "Open Kiro Hook UI" to manage hooks

## 🔍 **Finding Information**

### **By Role**
- **New Developer**: Start with [Project Overview](../README.md) → [Development Setup](development-setup.md)
- **Feature Developer**: Check [Feature Documentation](features/README.md) → [API Documentation](api/README.md)
- **DevOps/Deployment**: See [Deployment Guide](deployment/deployment.md)

### **By Task**
- **Understanding a feature**: Check `docs/features/[feature-name]/`
- **API integration**: See `docs/api/`
- **Deployment issues**: Check `docs/deployment/`
- **Project decisions**: Review `docs/project-management/decision-log.md`

## 🔧 **Maintaining Documentation**

### **Quality Automation**
```bash
# Check documentation quality
npm run quality-audit

# Auto-create Linear issues for problems
npm run quality-audit:create-issues
```

### **Adding New Documentation**
1. **Features**: Add to `docs/features/[feature-name]/`
2. **API Changes**: Update `docs/api/`
3. **Decisions**: Log in `docs/project-management/decision-log.md`
4. **Templates**: Use templates from `docs/project-management/templates/`

### **Documentation Standards**
- Use clear, descriptive filenames (no timestamps!)
- Include README.md in each major directory
- Link related documentation
- Update the decision log for architectural changes
- Run quality checks before committing

---

**Last Updated**: September 2025  
**Maintained By**: Solo Developer Workflow  
**Quality System**: Automated with Linear integration