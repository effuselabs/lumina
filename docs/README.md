# Lumina Documentation

> **Comprehensive documentation for the Lumina V-SaaS platform**

## 📚 **Documentation Structure**

### **🚀 Getting Started**
- [Project Overview](../README.md) - Main project information
- [Development Setup](project-management/development-setup.md) - How to set up the development environment
- [Contributing Guidelines](../CONTRIBUTING.md) - How to contribute to the project

### **🏗️ Architecture & Features**
- [API Documentation](api/README.md) - REST API endpoints and schemas
- [Feature Documentation](features/README.md) - Individual feature guides
- [Authentication System](features/authentication/README.md) - How authentication works

### **🔧 Development & Project Management**
- [Development Plan](project-management/development-plan.md) - Current development roadmap
- [Decision Log](project-management/decision-log.md) - Architectural decisions and rationale
- [Linear Integration](project-management/linear-integration.md) - Project management workflow
- [Quality Automation](project-management/quality-automation.md) - Documentation quality system
- [Templates](project-management/templates/README.md) - Issue and documentation templates

### **🚀 Deployment & Operations**
- [Deployment Guide](deployment/deployment.md) - How to deploy the application
- [Rollback Procedures](deployment/rollback-procedures.md) - Emergency rollback steps

### **🧪 Testing**
- [Testing Strategy](testing/testing-strategy.md) - Testing approach and guidelines
- [Test Results](testing/) - Test execution results and reports

### **🔧 Troubleshooting**
- [Common Issues](troubleshooting/) - Solutions to common problems
- [Workflow Troubleshooting](troubleshooting/workflow-troubleshooting-guide.md) - Development workflow issues

### **📁 Archive**
- [Migration Documentation](migration/README.md) - Documentation migration process and results
- [Archived Documents](archive/) - Outdated documentation for reference

## 🎯 **Documentation Philosophy**

This documentation follows a **solo developer workflow** optimized for:
- **Minimal overhead** - Quick to update, easy to maintain
- **AI-friendly** - Structured for AI context loading
- **Decision preservation** - Architectural choices and rationale documented
- **Quality automation** - Automated quality checks and Linear integration

## 🔍 **Finding Information**

### **By Role**
- **New Developer**: Start with [Project Overview](../README.md) → [Development Setup](project-management/development-setup.md)
- **Feature Developer**: Check [Feature Documentation](features/README.md) → [API Documentation](api/README.md)
- **DevOps/Deployment**: See [Deployment Guide](deployment/deployment.md) → [Troubleshooting](troubleshooting/)

### **By Task**
- **Understanding a feature**: Check `docs/features/[feature-name]/`
- **API integration**: See `docs/api/`
- **Deployment issues**: Check `docs/deployment/` and `docs/troubleshooting/`
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