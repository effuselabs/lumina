# Lumina SaaS - MVP Development Plan

* **Version:** 3.1
* **Date:** January 27, 2025
* **Status:** Enhanced with Workflow Integration
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

### Sprint 1: Business Onboarding & Data Import
* **Task 1:** Create the "Create Business Profile" and "Financial Models" UI and backend logic.
* **Task 2:** Build the "Service Management" page (CRUD for services).
* **Task 3:** Develop a CSV import tool for existing client lists, including UI and parsing logic.
* **Task 4:** Map imported client data to the `Clients` table in the database.

### Sprint 2: The Booking Engine
* **Task 1:** Design and build the UI for the public-facing booking page.
* **Task 2:** Develop the calendar view to show available time slots.
* **Task 3:** Implement the booking form and backend logic to save appointments.
* **Task 4:** Set up automated email confirmations for new bookings.

### Sprint 3: Staff & Client Management (CRM)
* **Task 1:** Build the "Staff" page with an email invitation system and hybrid employment model configuration (commission, chair rental, hybrid arrangements).
* **Task 2:** Create the "Clients" page with a searchable list of all clients.
* **Task 3:** Develop the "Client Detail" view showing contact info and appointment history.

### Sprint 4: Core Financials & Transaction Logging
* **Task 1:** Design and build a simple "Checkout" interface for staff.
* **Task 2:** Integrate with Stripe API for payment processing.
* **Task 3:** Implement logic to record Lumina-native transactions.
* **Task 4:** Design data models to accommodate external POS transaction data.
* **Task 5:** Develop the backend logic to calculate staff earnings for all employment models (commission, chair rental, hybrid arrangements).

### Sprint 5: Dashboard & MVP Polish
* **Task 1:** Build the UI for the main Lumina Dashboard page, using the Lumina Radiant Gradient for primary actions.
* **Task 2:** Create data widgets for "Today's Appointments" and "Daily/Weekly Revenue Summary".
* **Task 3:** Perform a full responsive design review and end-to-end testing.
* **Task 4:** Final bug bash and deployment to the `production` branch.

---
## 6.0 Post-MVP & Future Integrations

* **QuickBooks Integration:** Allow users to sync their daily sales and transaction data directly to their QuickBooks Online account.
* **External POS Integration (Square):** Allow businesses to sync transaction data from their existing POS.
* **The AI-Powered Advantage:** Develop the AI engine to provide actionable insights on the dashboard, fulfilling the core brand promise.