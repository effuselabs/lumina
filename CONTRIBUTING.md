# Contributing to Lumina

Thank you for your interest in contributing to Lumina! This guide will help you get started with the development process and understand our workflow.

## 🚀 Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (recommended)
- OR Node.js 18+ and PostgreSQL 14+ (for local development)

### Quick Start with Docker (Recommended)

1. **Clone the repository**

   ```bash
   git clone https://github.com/jshields-ca/lumina.git
   cd lumina
   ```

2. **Start the development environment**

   ```bash
   npm run docker:dev
   ```

3. **Initialize the database**

   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. **Access the application**
   - Application: [http://localhost:3000](http://localhost:3000)
   - Authentication: [http://localhost:3000/auth/signin](http://localhost:3000/auth/signin)
   - Prisma Studio: [http://localhost:5555](http://localhost:5555)
   - Health Check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### 🎭 Demo Accounts

After seeding the database, you can use these demo accounts:

```yaml
Business Owner:
  Email: owner@lumina-demo.com
  Password: demo123

Senior Hair Stylist:
  Email: mike@lumina-demo.com
  Password: demo123

Nail Technician & Colorist:
  Email: emma@lumina-demo.com
  Password: demo123
```

**Demo Business**: Lumina Demo Salon with pre-configured services, clients, and appointments.

### Local Development (without Docker)

1. **Clone the repository**

   ```bash
   git clone https://github.com/jshields-ca/lumina.git
   cd lumina
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up the database**

   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

7. **Sign in with demo accounts**
   Use the demo accounts listed above to explore the application

📖 **For detailed setup instructions, see [Development Setup Guide](docs/development-setup.md)**

## 🤝 Contributing Workflow

We use a **Feature Branch Workflow** for all development.

### Current Development Process (Solo Development)

1. **Create Linear Issue**: All development work starts with a Linear issue
2. **Create Feature Branch**: `git checkout -b feat/LUM-XXX-feature-name`
3. **Make Changes**: Implement feature following Linear issue requirements
4. **Add Tests**: Ensure comprehensive test coverage (80%+ target)
5. **Commit Changes**: Use conventional commit messages
6. **Merge to Main**: Direct merge to `main` (no PR required currently)
7. **Update Linear**: Mark Linear issue as complete with implementation summary

### Future Team Workflow (When Team Expands)

1. **Create Feature Branch**: `git checkout -b feat/your-feature-name`
2. **Make Changes** and add tests
3. **Commit with Conventional Messages**: `git commit -m 'feat: add amazing feature'`
4. **Push to Branch**: `git push origin feat/your-feature-name`
5. **Open Pull Request** with description and testing notes
6. **Code Review**: All changes require code review before merging
7. **Merge to Main**: After approval and CI checks pass

## 📋 Development Standards

### Branching Strategy

- **Feature Branches**: `feat/LUM-XXX-feature-name` (linked to Linear issues)
- **Bug Fixes**: `fix/LUM-XXX-bug-description`
- **Documentation**: `docs/update-description`
- **Refactoring**: `refactor/component-or-area`

### Code Style

- **ESLint + Prettier**: Automated formatting with pre-commit hooks
- **TypeScript Strict Mode**: Comprehensive type checking required
- **Conventional Commits**: Follow [Conventional Commits](https://conventionalcommits.org/) specification
- **File Naming**: Use kebab-case for files, PascalCase for components

### Testing Requirements

- **Unit Tests**: All new features must include unit tests
- **Integration Tests**: API endpoints require integration tests
- **E2E Tests**: Critical user flows must have end-to-end tests
- **Coverage Target**: Maintain 80%+ code coverage

### Documentation Requirements

- **Feature Documentation**: All new features require comprehensive documentation
- **API Documentation**: Document all new API endpoints
- **Update Changelog**: Add entries to CHANGELOG.md for all changes
- **Linear Integration**: Link commits and documentation to Linear issues

## 🔧 Development Guidelines

### Multi-Tenant Architecture

All development must follow multi-tenant patterns:

- **Business Scoping**: All data operations must include `businessId` filtering
- **Permission Checks**: Verify user has access to requested business
- **Security First**: Follow security guidelines for authentication and data protection

### Code Quality Standards

- **TypeScript**: Use strict mode with comprehensive type checking
- **Error Handling**: Implement proper error handling with user-friendly messages
- **Performance**: Consider performance implications of all changes
- **Accessibility**: Ensure all UI changes meet WCAG 2.1 AA standards

### Project conventions

Coding, API, database, UI and security conventions live in `CLAUDE.md` at the
repository root — a single file, read by both people and AI assistants at the
start of every session.

Conventions that can be enforced mechanically are enforced by ESLint rules and
tests rather than described in prose, so that a violation fails CI instead of
becoming a document nobody reads.

## 🧪 Testing

### Running Tests

```bash
npm run test              # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Generate coverage report
npm run test:e2e          # Run end-to-end tests
```

### Writing Tests

- **Unit Tests**: Place test files next to the code they test (`component.test.tsx`)
- **Integration Tests**: Place in `__tests__/integration/` directory
- **E2E Tests**: Place in `e2e/` directory with descriptive names

## 📚 Documentation

### Required Documentation

- **Feature Documentation**: Create comprehensive documentation in `docs/features/`
- **API Documentation**: Document endpoints in `docs/api/`
- **Update README**: Update relevant sections for significant changes
- **Changelog**: Add entries following [Keep a Changelog](https://keepachangelog.com/) format

### Documentation Standards

- **Clear Language**: Write for future team members and contributors
- **Code Examples**: Include practical examples and usage patterns
- **Cross-References**: Link related documentation appropriately
- **Maintenance**: Keep documentation current with code changes

## 🚀 Deployment

### Current Process

- **Development**: Local development with Docker Compose
- **Staging**: _Planned_ - Automatic deployment from `main` branch
- **Production**: _Planned_ - Manual promotion process

### Future Process

- **Feature Branches**: Automatic preview deployments
- **Staging**: Automatic deployment on merge to `main`
- **Production**: Manual promotion with approval process

## 📞 Support

### Getting Help

- **Documentation**: Check [Complete Documentation Hub](docs/README.md) first
- **Linear Issues**: Create issues for bugs or feature requests
- **Development Setup**: See [Development Setup Guide](docs/development-setup.md)

### Reporting Issues

1. **Check Existing Issues**: Search Linear for existing reports
2. **Create Linear Issue**: Use appropriate labels and templates
3. **Provide Context**: Include steps to reproduce, expected behavior, and environment details
4. **Link Related Work**: Reference related issues or documentation

## 📋 Checklist for Contributors

Before submitting changes:

- [ ] Code follows TypeScript strict mode requirements
- [ ] All tests pass (`npm run test`)
- [ ] Code coverage meets 80% target
- [ ] ESLint passes without errors (`npm run lint`)
- [ ] Documentation updated for new features
- [ ] CHANGELOG.md updated with changes
- [ ] Linear issue linked and updated
- [ ] Multi-tenant security patterns followed
- [ ] Accessibility standards met (WCAG 2.1 AA)

## 🎯 Project Vision

Remember that Lumina's mission is to **"Stop managing your business and start building your passion."** All contributions should align with this vision of empowering salon and barbershop owners through intelligent, intuitive software.

---

Thank you for contributing to Lumina! Your efforts help democratize the power of technology for small businesses.
