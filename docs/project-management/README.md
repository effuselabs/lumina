# Project Management Documentation

This directory contains all project management and workflow documentation for the Lumina project.

## 📋 Quick Navigation

### Core Workflow Documentation
- [**LINEAR_INTEGRATION.md**](./LINEAR_INTEGRATION.md) - Complete Linear workflow and integration guide
- [**GIT_WORKFLOW.md**](./GIT_WORKFLOW.md) - Git branching strategy and development process
- [**Issue Templates**](./templates/) - Standardized Linear issue templates

### Related Documentation
- [Contributing Guidelines](../../CONTRIBUTING.md) - How to contribute to the project
- [Development Setup](../DEVELOPMENT_SETUP.md) - Local development environment
- [Testing Strategy](../testing/README.md) - Testing workflow and practices

## 🎯 Project Management Overview

### Linear Integration
Lumina uses Linear for comprehensive project management with:
- **Automated issue tracking** with Linear API integration
- **Standardized labeling system** for consistent organization
- **Epic-based organization** aligned with development phases
- **Automated status updates** based on git workflow

### Git Workflow
Development follows a feature branch workflow with:
- **Feature branches** for all new development
- **Linear issue integration** in branch names and commits
- **Pull request reviews** with automated testing
- **Automated deployment** on merge to main

### Issue Management
Structured issue management with:
- **Standardized templates** for bugs, features, and epics
- **Consistent labeling** for type, priority, module, and status
- **Clear acceptance criteria** for all development tasks
- **Automated progress tracking** and reporting

## 🏷️ Linear Label System

### Type Labels
- `Type: Bug` - Unexpected errors or incorrect behavior
- `Type: Feature` - New functionality or user-facing changes
- `Type: Task` - Development tasks not directly user-facing
- `Type: Epic` - Large feature areas spanning multiple issues
- `Type: Integration` - Third-party service integrations

### Priority Labels
- `P1: Critical` - Blocks development or user functionality
- `P2: High` - Major features or core functionality bugs
- `P3: Medium` - Standard features or minor bugs
- `P4: Low` - Nice-to-have features or cosmetic issues

### Module Labels
- `Module: Auth` - Authentication and user management
- `Module: Booking` - Appointment scheduling and calendar
- `Module: CRM` - Client and staff management
- `Module: Financials` - POS, reporting, and payroll
- `Module: Dashboard` - Main dashboard and analytics
- `Module: Infrastructure` - CI/CD, deployment, and tooling

### Status Labels
- `Status: To Do` - Ready to be worked on
- `Status: In Progress` - Actively being developed
- `Status: In Review` - Code review in progress
- `Status: Testing` - QA and testing phase
- `Status: Done` - Completed and merged

## 🚀 Development Workflow

### 1. Issue Creation
```markdown
1. Create Linear issue with appropriate labels
2. Define clear acceptance criteria
3. Estimate effort and assign to sprint
4. Link to related issues or epics
```

### 2. Development Process
```bash
# Create feature branch
git checkout -b feat/LUM-123-feature-name

# Develop with regular commits
git commit -m "feat(scope): description [LUM-123]"

# Push and create PR
git push origin feat/LUM-123-feature-name
```

### 3. Review and Merge
```markdown
1. Open pull request with Linear issue reference
2. Automated tests and checks run
3. Code review by team members
4. Merge to main triggers deployment
5. Linear issue automatically updated to "Done"
```

## 📊 Project Tracking

### Current Epic Status
- ✅ **Foundation Epic** - Complete (Authentication, Database, CI/CD)
- ✅ **Business Management Epic** ([LUM-41](https://linear.app/lumina/issue/LUM-41)) - Complete
- ✅ **Booking Engine Epic** ([LUM-42](https://linear.app/lumina/issue/LUM-42)) - Complete
- 🚧 **Staff Management Epic** - In Progress
- 📋 **Payment Processing Epic** - Planned
- 📋 **Analytics Dashboard Epic** - Planned

### Development Metrics
- **Velocity**: Tracked per sprint with Linear reporting
- **Cycle Time**: From issue creation to deployment
- **Bug Rate**: Bugs per feature delivery
- **Test Coverage**: Maintained at 80%+ for critical paths

## 🛠️ Tools and Integrations

### Linear Integration
- **API Integration**: Automated issue updates from git workflow
- **Webhook Configuration**: Real-time status synchronization
- **Custom Fields**: Project-specific metadata tracking
- **Reporting**: Sprint velocity and burndown tracking

### Git Integration
- **Branch Naming**: Includes Linear issue numbers
- **Commit Messages**: Reference Linear issues
- **PR Templates**: Standardized pull request format
- **Automated Linking**: PRs automatically link to Linear issues

### CI/CD Integration
- **Automated Testing**: All tests must pass before merge
- **Deployment Gates**: Linear issue status gates deployment
- **Release Notes**: Generated from Linear issue descriptions
- **Rollback Procedures**: Linked to Linear incident management

## 📚 Best Practices

### Issue Management
1. **Clear Titles**: Descriptive and searchable issue titles
2. **Detailed Descriptions**: Include context and acceptance criteria
3. **Proper Labels**: Apply consistent labeling for organization
4. **Regular Updates**: Keep issues current with progress
5. **Link Dependencies**: Connect related issues and blockers

### Development Process
1. **Small Issues**: Break large features into manageable tasks
2. **Clear Commits**: Descriptive commit messages with Linear references
3. **Regular Pushes**: Push work frequently to avoid conflicts
4. **Code Reviews**: Always get code reviewed before merging
5. **Testing**: Include tests with all new functionality

### Communication
1. **Issue Comments**: Use for status updates and questions
2. **PR Descriptions**: Clear summary of changes and testing
3. **Team Updates**: Regular standup and sprint planning
4. **Documentation**: Keep project docs updated with changes
5. **Retrospectives**: Regular process improvement sessions

## 🔗 Related Resources

### Internal Documentation
- [Linear Integration Guide](./LINEAR_INTEGRATION.md) - Detailed Linear workflow
- [Git Workflow Guide](./GIT_WORKFLOW.md) - Complete git process
- [Issue Templates](./templates/) - Standardized templates
- [Contributing Guidelines](../../CONTRIBUTING.md) - Contribution process

### External Resources
- [Linear Documentation](https://linear.app/docs) - Official Linear docs
- [Git Best Practices](https://git-scm.com/book) - Git documentation
- [Conventional Commits](https://conventionalcommits.org/) - Commit format standard
- [GitHub Flow](https://guides.github.com/introduction/flow/) - Git workflow guide

---

**Last Updated**: January 9, 2025  
**Maintained By**: Development Team  
**Review Schedule**: Monthly