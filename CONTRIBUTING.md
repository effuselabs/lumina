# Contributing to Lumina

Thank you for your interest in contributing to Lumina! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Development Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/jshields-ca/lumina.git
   cd lumina
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env.local
   # Configure your environment variables
   ```

3. **Database setup**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

## 📋 Development Workflow

We use a **Feature Branch Workflow**. Please read our [Git Workflow Guide](docs/GIT_WORKFLOW.md) for detailed instructions.

### Branch Strategy

- **`main`**: Production-ready code, always deployable
- **`feat/feature-name`**: New features and enhancements
- **`fix/bug-description`**: Bug fixes
- **`chore/task-description`**: Maintenance tasks
- **`docs/update-description`**: Documentation updates

### Quick Workflow
1. **Create feature branch**: `git checkout -b feat/your-feature-name`
2. **Develop and test** your changes
3. **Commit with conventional messages**: `git commit -m 'feat: add new feature'`
4. **Push and create PR**: `git push origin feat/your-feature-name`
5. **Address review feedback** and merge

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(auth): add Google OAuth integration
fix(booking): resolve double booking conflict
docs(readme): update setup instructions
chore(deps): update dependencies
```

### Changelog Updates

For significant changes, please update the [CHANGELOG.md](CHANGELOG.md):
- Add entries under the `[Unreleased]` section
- Follow the [Keep a Changelog](https://keepachangelog.com/) format
- Include breaking changes and migration notes when applicable
docs(readme): update installation instructions
test(crm): add client search integration tests
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `style`: Code style changes
- `chore`: Build process or auxiliary tool changes

### Pull Request Process

1. **Create feature branch**
   ```bash
   git checkout -b feat/LUM-XXX-feature-name
   ```

2. **Make changes** following our coding standards

3. **Test your changes**
   ```bash
   npm run test
   npm run test:e2e
   npm run lint
   npm run type-check
   ```

4. **Commit with conventional format**
   ```bash
   git commit -m "feat(booking): add real-time availability updates"
   ```

5. **Push and create PR**
   ```bash
   git push origin feat/LUM-XXX-feature-name
   ```

6. **Link to Linear issue** in PR description

## 🧪 Testing Standards

### Test Requirements

- **Unit Tests**: All business logic must have unit tests
- **Integration Tests**: All API endpoints must have integration tests
- **E2E Tests**: Critical user journeys must have E2E tests
- **Coverage**: Maintain 80%+ code coverage

### Test Structure

```typescript
// Unit test example
describe('CommissionCalculator', () => {
  it('should calculate commission correctly for percentage model', () => {
    const calculator = new CommissionCalculator('percentage', 0.4);
    const result = calculator.calculate(100);
    expect(result).toBe(40);
  });
});

// Integration test example
describe('POST /api/bookings', () => {
  it('should create booking with valid data', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .send(validBookingData)
      .expect(201);
    
    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'confirmed'
    });
  });
});
```

## 🎨 Code Style

### TypeScript Standards

- **Strict mode**: Always use TypeScript strict mode
- **Type definitions**: Create proper types for all data structures
- **No `any`**: Avoid using `any` type, use proper typing
- **Interfaces**: Use interfaces for object shapes

```typescript
// Good
interface BookingData {
  clientId: string;
  serviceId: string;
  startTime: Date;
  duration: number;
}

// Avoid
const bookingData: any = { ... };
```

### React Standards

- **Functional Components**: Use functional components with hooks
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Props Interface**: Define props interfaces for all components
- **Error Boundaries**: Implement error boundaries for robust UX

```typescript
// Good
interface BookingFormProps {
  onSubmit: (data: BookingData) => void;
  initialData?: Partial<BookingData>;
}

export function BookingForm({ onSubmit, initialData }: BookingFormProps) {
  // Component implementation
}
```

### File Organization

```
components/
├── ui/                 # Base UI components (Button, Input, etc.)
├── forms/             # Form-specific components
├── charts/            # Data visualization components
└── [feature]/         # Feature-specific components

lib/
├── auth.ts            # Authentication utilities
├── db.ts              # Database utilities
├── validations/       # Zod validation schemas
└── utils.ts           # General utilities

types/
├── auth.ts            # Authentication types
├── booking.ts         # Booking-related types
└── database.ts        # Database model types
```

## 🏗 Architecture Guidelines

### API Design

- **RESTful**: Follow REST conventions for API endpoints
- **Validation**: Use Zod for request/response validation
- **Error Handling**: Consistent error response format
- **Authentication**: Protect routes with proper middleware

```typescript
// API route example
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = bookingSchema.parse(body);
    
    const booking = await createBooking(validatedData);
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Database Guidelines

- **Prisma Schema**: Use Prisma for database modeling
- **Migrations**: Always create migrations for schema changes
- **Relationships**: Define proper foreign key relationships
- **Indexing**: Add indexes for frequently queried fields

```prisma
model Appointment {
  id          String   @id @default(cuid())
  clientId    String
  serviceId   String
  staffId     String
  startTime   DateTime
  endTime     DateTime
  status      AppointmentStatus @default(SCHEDULED)
  
  client      Client   @relation(fields: [clientId], references: [id])
  service     Service  @relation(fields: [serviceId], references: [id])
  staff       Staff    @relation(fields: [staffId], references: [id])
  
  @@index([startTime])
  @@index([clientId])
  @@index([staffId])
}
```

## 🔒 Security Guidelines

- **Input Validation**: Validate all user inputs
- **Authentication**: Use NextAuth.js for authentication
- **Authorization**: Implement proper role-based access control
- **Environment Variables**: Never commit secrets to version control
- **SQL Injection**: Use Prisma ORM to prevent SQL injection
- **XSS Protection**: Sanitize user-generated content

## 📊 Performance Guidelines

- **Database Queries**: Optimize queries and use proper indexing
- **Caching**: Implement caching for frequently accessed data
- **Bundle Size**: Monitor and optimize bundle size
- **Core Web Vitals**: Maintain good Core Web Vitals scores
- **Image Optimization**: Use Next.js Image component

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: Browser, OS, Node.js version
6. **Screenshots**: If applicable

## 💡 Feature Requests

When requesting features:

1. **Use Case**: Describe the business use case
2. **User Story**: Write a user story format
3. **Acceptance Criteria**: Define what "done" looks like
4. **Priority**: Suggest priority level and reasoning

## 📞 Getting Help

- **Linear Issues**: Check existing issues first
- **Documentation**: Review README and code comments
- **Code Review**: Ask for help in PR comments
- **Architecture Questions**: Tag @jeremy in Linear

## 🎯 Definition of Done

A task is considered complete when:

- [ ] Code is implemented and follows style guidelines
- [ ] Unit tests are written and passing
- [ ] Integration tests are written and passing (if applicable)
- [ ] E2E tests are written and passing (for user-facing features)
- [ ] Code is reviewed and approved
- [ ] Documentation is updated (if applicable)
- [ ] Linear issue is updated and closed

---

Thank you for contributing to Lumina! 🚀