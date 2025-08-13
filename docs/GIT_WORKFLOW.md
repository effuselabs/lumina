# Git Workflow & Branching Strategy

This document outlines the Git workflow and branching strategy for the Lumina project.

## 🌿 Branching Strategy

We use a **Feature Branch Workflow** with the following branch structure:

### Branch Types

- **`main`** - Production-ready code, always deployable
- **`feat/feature-name`** - New features and enhancements
- **`fix/bug-description`** - Bug fixes
- **`chore/task-description`** - Maintenance tasks, refactoring
- **`docs/update-description`** - Documentation updates

### Branch Naming Convention

```bash
# Features
feat/ui-design-system
feat/booking-engine
feat/client-management

# Bug fixes
fix/auth-session-timeout
fix/database-connection-pool

# Chores
chore/update-dependencies
chore/optimize-docker-build

# Documentation
docs/api-documentation
docs/deployment-guide
```

## 🚀 Workflow Process

### 1. Starting New Work

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create and switch to new feature branch
git checkout -b feat/your-feature-name

# Start development
```

### 2. Development Cycle

```bash
# Make your changes
# Add and commit frequently with descriptive messages
git add .
git commit -m "feat: implement user authentication flow

- Add NextAuth.js configuration
- Create sign-in and sign-up components
- Implement role-based access control"

# Push to remote branch
git push origin feat/your-feature-name
```

### 3. Pull Request Process

1. **Create Pull Request** on GitHub
2. **Fill out PR template** with description and testing notes
3. **Request code review** from team members
4. **Address feedback** and push updates
5. **Merge to main** after approval

### 4. After Merge

```bash
# Switch back to main
git checkout main

# Pull latest changes
git pull origin main

# Delete local feature branch
git branch -d feat/your-feature-name

# Delete remote feature branch (optional, GitHub can do this automatically)
git push origin --delete feat/your-feature-name
```

## 📝 Commit Message Convention

We follow **Conventional Commits** specification:

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples
```bash
feat: add user authentication system
fix: resolve database connection timeout
docs: update API documentation
style: format code with prettier
refactor: optimize database queries
test: add unit tests for auth service
chore: update dependencies
```

## 🔄 Development Phases

### Phase 1: Foundation (Current - Main Branch)
- ✅ Project setup and containerization
- ✅ Database architecture and ORM
- ✅ Authentication system
- 🚧 UI design system
- 🚧 CI/CD pipeline
- 🚧 Testing framework

### Phase 2: Core Features (Feature Branches)
- Business onboarding system
- Booking engine
- Client management
- Staff management
- Point of sale system

### Phase 3: Advanced Features (Feature Branches)
- Financial reporting
- Analytics dashboard
- AI-powered insights
- Third-party integrations

## 🛡️ Branch Protection Rules

### Main Branch Protection
- **Require pull request reviews** before merging
- **Require status checks** to pass before merging
- **Require branches to be up to date** before merging
- **Restrict pushes** that create merge commits

### Quality Gates
- All tests must pass
- Code coverage must meet minimum threshold
- ESLint checks must pass
- TypeScript compilation must succeed

## 🚀 Deployment Strategy

### Environments
- **Development**: Feature branches (local development)
- **Staging**: `main` branch (automatic deployment)
- **Production**: Manual promotion from staging

### Deployment Flow
```
Feature Branch → PR → Main → Staging → Production
```

## 🔧 Git Configuration

### Recommended Git Config
```bash
# Set up user information
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set up default branch name
git config --global init.defaultBranch main

# Set up pull strategy
git config --global pull.rebase false

# Set up editor (optional)
git config --global core.editor "code --wait"
```

### Git Hooks (Husky)
We use Husky for automated quality checks:

- **pre-commit**: Runs lint-staged for code formatting
- **commit-msg**: Validates commit message format
- **pre-push**: Runs tests before pushing (planned)

## 📋 Pull Request Template

When creating a pull request, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No merge conflicts
```

## 🚨 Emergency Hotfixes

For critical production issues:

```bash
# Create hotfix branch from main
git checkout main
git checkout -b fix/critical-security-patch

# Make minimal fix
# Test thoroughly
# Create PR with "HOTFIX" label
# Fast-track review and merge
# Deploy immediately
```

## 📊 Branch Management

### Regular Maintenance
- Delete merged feature branches
- Keep main branch clean and up-to-date
- Regular dependency updates via chore branches
- Monitor branch age and encourage timely merges

### Branch Naming Best Practices
- Use lowercase with hyphens
- Be descriptive but concise
- Include Linear ticket number when applicable: `feat/lum-44-ui-design-system`
- Avoid special characters and spaces

## 🤝 Code Review Guidelines

### For Authors
- Keep PRs focused and reasonably sized
- Write clear commit messages
- Include tests for new functionality
- Update documentation as needed
- Respond promptly to review feedback

### For Reviewers
- Review within 24 hours when possible
- Focus on logic, security, and maintainability
- Be constructive and specific in feedback
- Approve when ready, request changes when needed
- Consider the bigger picture and architecture

## 🔍 Troubleshooting

### Common Issues

**Merge Conflicts**
```bash
# Update your branch with latest main
git checkout feat/your-branch
git fetch origin
git merge origin/main
# Resolve conflicts manually
git add .
git commit -m "resolve merge conflicts"
```

**Accidentally Committed to Main**
```bash
# Create new branch from current state
git checkout -b feat/accidental-commits

# Reset main to previous state
git checkout main
git reset --hard HEAD~1  # or specific commit hash

# Continue work on feature branch
git checkout feat/accidental-commits
```

**Need to Update Branch Name**
```bash
# Rename local branch
git branch -m old-name new-name

# Delete old remote branch and push new one
git push origin --delete old-name
git push origin new-name
```

This workflow ensures code quality, enables collaboration, and maintains a clean project history while supporting rapid development.