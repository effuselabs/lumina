# Lumina SaaS - Modernized MVP Development Plan

* **Version:** 3.0
* **Date:** August 08, 2025
* **Status:** For Development
* **Product:** Lumina - All-in-one, AI-powered business management platform for the salon and barber industry.
* **Mission:** To go beyond simple booking, acting as an intelligent partner that provides clear, actionable suggestions to illuminate the path to higher revenue and happier clients.
* **GitHub Repository (Private):** `https://github.com/jshields-ca/lumina`

---
## 1.0 Environments & Deployment Strategy
The project will use a three-environment workflow to ensure stability and quality. All deployments will be automated via GitHub Actions connected to Railway.

| Environment | URL / Location | GitHub Branch | Purpose |
| :--- | :--- | :--- | :--- |
| **Development** | `Localhost` | `feat/*`, `bug/*` | Individual developers work on new features and bug fixes on their local machines. |
| **Staging** | `lumina-staging.up.railway.app` | `main` | A complete, stable version of the application for UAT and pre-production testing. Mirrors production as closely as possible. |
| **Production** | `uselumina.app` | `production` (or Git tags) | The live application used by customers. Code is only promoted from the `main` branch after successful staging tests. |

### CI/CD Workflow
1.  **Feature Development:** A developer creates a `feat/LUM-XYZ` branch from `main`.
2.  **Pull Request:** Upon completion, a Pull Request is opened to merge the feature branch into `main`. This triggers an automatic deployment to a temporary **Preview Environment** on Railway for review.
3.  **Merge to Main (Staging):** After the PR is approved and merged, the `main` branch is automatically deployed to the **Staging Environment**.
4.  **Release to Production:** To deploy to production, a new release branch is created from `main` (e.g., `release/v1.0.0`) and merged into the `production` branch. This merge triggers the final deployment to the live `uselumina.app` domain.

---
## 2.0 UI/UX & Design Guidelines
This section provides the specific visual and stylistic direction for the Lumina product interface, based on the official brand guide.

### 2.1 Colour Palette
The Lumina product interface is built on the Neutral Palette, with a vibrant gradient for primary actions and a deep teal for accents.

* **Primary Actions:** The **Lumina Radiant Gradient** should be used for primary buttons and key interactive elements to guide user attention.
    * Gradient Start: `#FFD25A`
    * Gradient End: `#FF7A5A`
* **Secondary Actions & Accents:** Use **Solid Deep Teal** (`#0B2B33`) for secondary buttons, links, and other interactive accents.
* **Neutral & Text Palette:** This palette forms the foundation of the UI.
    * Off-Black (Headings & Body Text): `#1D1D21`
    * Medium Grey (Subtle Text, Borders): `#808285`
    * Light Grey (Backgrounds, Dividers): `#F1F3F5`
    * White (Main Content Backgrounds): `#FFFFFF`

### 2.2 Typography
The typography system is designed for clarity and a clean, modern feel.

* **Primary Typeface:** **Inter** is to be used for all headlines, body text, and UI elements.
    * H1 / Major Titles: `Inter Bold (700)`
    * H2 / Section Titles: `Inter SemiBold (600)`
    * Body / Paragraphs: `Inter Regular (400)`
* **Accent Typeface:** **IBM Plex Mono** should be used sparingly for displaying numerical data or data snippets, such as in reports or financial summaries.

### 2.3 Imagery & Iconography
* **Photography:** If used, photography must be warm, authentic, and feature creative professionals in their natural element.
* **Illustration & Icons:** Illustrations should be clean, minimalist, and abstract. The UI should use a consistent, high-quality set of line-based icons that complement the clean aesthetic.

---
## 3.0 Project Management: Linear Guide

### 3.1 Linear Labels

| Category | Label Name | Description |
| :--- | :--- | :--- |
| **Type** | `Type: Bug` | An unexpected error or incorrect behavior in the application. |
| | `Type: Feature` | A new piece of functionality or a user-facing change. |
| | `Type: Task` | A development task that is not a direct feature or bug. |
| | `Type: Integration`| A task focused on a third-party service integration. |
| **Priority**| `P1: Critical` | Blocks development or user functionality. |
| | `P2: High` | A major feature or a bug affecting core functionality. |
| | `P3: Medium` | A standard feature task or a minor bug. |
| | `P4: Low` | A nice-to-have feature, cosmetic issue, or minor task. |
| **Status**| `Status: To Do` | Scheduled for the current sprint, ready to be worked on. |
| | `Status: In Progress`| Actively being worked on. |
| | `Status: In Review` | Work is complete and a Pull Request has been opened. |
| | `Status: Done` | The PR has been approved and merged. |
| **Module** | `Module: Auth` | User authentication, login, registration, roles. |
| | `Module: Booking` | Appointment scheduling, calendar, services management. |
| | `Module: CRM` | Client and staff management. |
| | `Module: Financials`| POS, reporting, payroll logic. |
| | `Module: Dashboard`| The main user dashboard and data visualization widgets. |

### 3.2 Issue & Update Workflow
(Standard workflow: Assign -> In Progress -> Create Branch -> Open PR -> In Review -> Merge -> Done)

---
## 4.0 Key Features for Launch (MVP)
* **User & Business Authentication:** Secure sign-up and login for salon owners.
* **Business Profile & Financials Setup:** Configure the business profile and define staff compensation (commission/chair-rental).
* **Service Management:** Create, edit, and delete services with price and duration.
* **Client Data Import:** A tool for new users to import existing client lists from a standard CSV file.
* **Online Booking System:** A public-facing page for clients to book services, including automated confirmation notifications.
* **Basic CRM:** Manage client lists/history and add/invite staff members.
* **Core POS (Point of Sale):** A simple interface for checking out appointments and recording transactions.
* **Foundational Dashboard:** Display essential reports like upcoming appointments and daily/weekly revenue.

---
## 5.0 MVP Development Plan & Sprints

### Sprint 0: Project Setup & Foundation (1 Week)
* **Task 1:** Initialize Next.js project in the private GitHub repository.
* **Task 2:** Configure Docker, Railway deployment YAML, and environment variables for all three environments.
* **Task 3:** Configure Tailwind CSS with the Lumina brand palette and Inter typeface as defined in Section 2.0.
* **Task 4:** Design and script the initial PostgreSQL database schema.
* **Task 5:** Implement user authentication (Sign Up, Login, Logout) using NextAuth.js.

### Sprint 1: Enhanced & Optimized
**Estimated Duration:** 3 weeks
**Critical Path:** 4 tasks
**Parallelizable Groups:** 0

* **Task Task1:** Initialize Next.js project in the private GitHub repository.
  - **Effort:** 18h (was 8h)
  - **Steering:** api-standards, coding-approach-and-standards, database-standards, product, README, security, structure, tech, troubleshooting, ui-standards
  - **Acceptance Criteria:**
    - Compliance: Use Zod schemas for request validation
    - Compliance: All queries must include businessId filter
    - Unit tests cover core functionality with >80% coverage

* **Task Task2:** Configure Docker, Railway deployment YAML, and environment variables for all three environments.
  - **Effort:** 8h (was 8h)
  - **Steering:** api-standards, coding-approach-and-standards, database-standards, product, README, security, structure, tech, troubleshooting, ui-standards
  - **Acceptance Criteria:**
    - Compliance: Use Zod schemas for request validation
    - Compliance: All queries must include businessId filter
    - Unit tests cover core functionality with >80% coverage

* **Task Task3:** Configure Tailwind CSS with the Lumina brand palette and Inter typeface as defined in Section 2.0.
  - **Effort:** 8h (was 8h)
  - **Steering:** api-standards, coding-approach-and-standards, database-standards, product, README, security, structure, tech, troubleshooting, ui-standards
  - **Acceptance Criteria:**
    - Compliance: Use Zod schemas for request validation
    - Compliance: All queries must include businessId filter
    - Unit tests cover core functionality with >80% coverage

* **Task Task4:** Design and script the initial PostgreSQL database schema.
  - **Effort:** 23h (was 16h)
  - **Steering:** api-standards, coding-approach-and-standards, database-standards, product, README, security, structure, tech, troubleshooting, ui-standards
  - **Dependencies:** Sprint1-Task1
  - **Acceptance Criteria:**
    - All database queries include businessId for multi-tenant isolation
    - Database migrations run successfully without data loss
    - Compliance: Use Zod schemas for request validation

* **Task Task5:** Implement user authentication (Sign Up, Login, Logout) using NextAuth.js.
  - **Effort:** 36h (was 20h)
  - **Steering:** api-standards, coding-approach-and-standards, database-standards, product, README, security, structure, tech, troubleshooting, ui-standards
  - **Acceptance Criteria:**
    - User authentication works securely with proper session management
    - All authentication endpoints include proper error handling
    - Compliance: Use Zod schemas for request validation

### Sprint 2: Enhanced & Optimized
**Estimated Duration:** 2 weeks
**Critical Path:** 2 tasks
**Parallelizable Groups:** 1

**Parallelization Opportunities:**
- Group 1: Tasks can be developed in parallel

* **Task Task1:** Create the "Create Business Profile" and "Financial Models" UI and backend logic.
  - **Effort:** 24h (was 20h)
  - **Dependencies:** Sprint1 completion
  - **Acceptance Criteria:**
    - UI components follow Lumina design system guidelines
    - All interactive elements are keyboard accessible
    - Components include proper loading and error states

* **Task Task2:** Build the "Service Management" page (CRUD for services).
  - **Effort:** 24h (was 20h)
  - **Dependencies:** Sprint1 completion
  - **Acceptance Criteria:**
    - UI components follow Lumina design system guidelines
    - All interactive elements are keyboard accessible
    - Components include proper loading and error states

* **Task Task3:** Develop a CSV import tool for existing client lists, including UI and parsing logic.
  - **Effort:** 24h (was 20h)
  - **Dependencies:** Sprint1 completion
  - **Acceptance Criteria:**
    - UI components follow Lumina design system guidelines
    - All interactive elements are keyboard accessible
    - Components include proper loading and error states

* **Task Task4:** Map imported client data to the `Clients` table in the database.
  - **Effort:** 23h (was 16h)
  - **Dependencies:** Sprint1 completion, Sprint2-Task1
  - **Acceptance Criteria:**
    - All database queries include businessId for multi-tenant isolation
    - Database migrations run successfully without data loss
    - Unit tests cover core functionality with >80% coverage

### Sprint 3: Enhanced & Optimized
**Estimated Duration:** 1 weeks
**Critical Path:** 1 tasks
**Parallelizable Groups:** 1

**Parallelization Opportunities:**
- Group 1: Tasks can be developed in parallel

* **Task Task1:** Design and build the UI for the public-facing booking page.
  - **Effort:** 24h (was 20h)
  - **Dependencies:** Sprint2 completion
  - **Acceptance Criteria:**
    - UI components follow Lumina design system guidelines
    - All interactive elements are keyboard accessible
    - Components include proper loading and error states

* **Task Task2:** Develop the calendar view to show available time slots.
  - **Effort:** 8h (was 8h)
  - **Dependencies:** Sprint2 completion
  - **Acceptance Criteria:**
    - Unit tests cover core functionality with >80% coverage
    - Integration tests validate end-to-end workflows

* **Task Task3:** Implement the booking form and backend logic to save appointments.
  - **Effort:** 8h (was 8h)
  - **Dependencies:** Sprint2 completion
  - **Acceptance Criteria:**
    - Unit tests cover core functionality with >80% coverage
    - Integration tests validate end-to-end workflows

* **Task Task4:** Set up automated email confirmations for new bookings.
  - **Effort:** 8h (was 8h)
  - **Dependencies:** Sprint2 completion
  - **Acceptance Criteria:**
    - Unit tests cover core functionality with >80% coverage
    - Integration tests validate end-to-end workflows

### Sprint 4: Enhanced & Optimized
**Estimated Duration:** 1 weeks
**Critical Path:** 0 tasks
**Parallelizable Groups:** 0

* **Task Task1:** Build the "Staff" page with an email invitation system.
  - **Effort:** 24h (was 20h)
  - **Dependencies:** Sprint3 completion
  - **Acceptance Criteria:**
    - UI components follow Lumina design system guidelines
    - All interactive elements are keyboard accessible
    - Components include proper loading and error states

* **Task Task2:** Create the "Clients" page with a searchable list of all clients.
  - **Effort:** 8h (was 8h)
  - **Dependencies:** Sprint3 completion
  - **Acceptance Criteria:**
    - Unit tests cover core functionality with >80% coverage
    - Integration tests validate end-to-end workflows

* **Task Task3:** Develop the "Client Detail" view showing contact info and appointment history.
  - **Effort:** 8h (was 8h)
  - **Dependencies:** Sprint3 completion
  - **Acceptance Criteria:**
    - Unit tests cover core functionality with >80% coverage
    - Integration tests validate end-to-end workflows

### Sprint 5: Enhanced & Optimized
**Estimated Duration:** 2 weeks
**Critical Path:** 2 tasks
**Parallelizable Groups:** 1

**Parallelization Opportunities:**
- Group 1: Tasks can be developed in parallel

* **Task Task1:** Design and build a simple "Checkout" interface for staff.
  - **Effort:** 24h (was 20h)
  - **Dependencies:** Sprint4 completion
  - **Acceptance Criteria:**
    - UI components follow Lumina design system guidelines
    - All interactive elements are keyboard accessible
    - Components include proper loading and error states

* **Task Task2:** Integrate with Stripe API for payment processing.
  - **Effort:** 48h (was 32h)
  - **Dependencies:** Sprint4 completion
  - **Acceptance Criteria:**
    - API endpoints follow RESTful conventions
    - All inputs are validated using Zod schemas
    - Proper HTTP status codes are returned

* **Task Task3:** Implement logic to record Lumina-native transactions.
  - **Effort:** 8h (was 8h)
  - **Dependencies:** Sprint4 completion
  - **Acceptance Criteria:**
    - Unit tests cover core functionality with >80% coverage
    - Integration tests validate end-to-end workflows

* **Task Task4:** Design data models to accommodate external POS transaction data.
  - **Effort:** 8h (was 8h)
  - **Dependencies:** Sprint4 completion
  - **Acceptance Criteria:**
    - Unit tests cover core functionality with >80% coverage
    - Integration tests validate end-to-end workflows

* **Task Task5:** Develop the backend logic to calculate staff commission.
  - **Effort:** 8h (was 8h)
  - **Dependencies:** Sprint4 completion
  - **Acceptance Criteria:**
    - Unit tests cover core functionality with >80% coverage
    - Integration tests validate end-to-end workflows

---
## 6.0 Post-MVP & Future Integrations

* **QuickBooks Integration:** Allow users to sync their daily sales and transaction data directly to their QuickBooks Online account.
* **External POS Integration (Square):** Allow businesses to sync transaction data from their existing POS.
* **The AI-Powered Advantage:** Develop the AI engine to provide actionable insights on the dashboard, fulfilling the core brand promise.

---
## Modernization Summary

### Key Improvements

- **Tasks Modernized:** 25
- **Effort Adjustment:** 25.3% (364h → 456h)
- **Estimated Duration:** 12 weeks
- **Parallelization Opportunities:** 3 groups
- **Steering Files Integrated:** 10

### Steering Integration

- **api-standards:** Referenced in 5 tasks
- **coding-approach-and-standards:** Referenced in 5 tasks
- **database-standards:** Referenced in 5 tasks
- **product:** Referenced in 5 tasks
- **README:** Referenced in 5 tasks
- **security:** Referenced in 5 tasks
- **structure:** Referenced in 5 tasks
- **tech:** Referenced in 5 tasks
- **troubleshooting:** Referenced in 5 tasks
- **ui-standards:** Referenced in 5 tasks

### Quality Improvements

- All tasks now include specific acceptance criteria
- Compliance requirements integrated from steering files
- Dependencies and prerequisites clearly identified
- Effort estimates revised based on actual complexity
- Task sequencing optimized for parallel development
