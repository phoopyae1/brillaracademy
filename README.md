# Brillar Academy Platform

A full-stack academic experience with a dedicated Next.js front end, an Express-based Node.js API, and PostgreSQL persistence.

## ✨ Highlights
- Clean, responsive landing page presenting the thirteen foundational pillars of Brillar Academy.
- App Router architecture with modern server components and streaming-ready data fetching.
- Shared Material UI design system with custom theming for a soft, elegant visual language.
- PostgreSQL-backed feature catalogue with graceful fallback data for local exploration.

## 🧰 Tech Stack
- **Front end:** Next.js 14 (App Router) with Material UI 5
- **Back end:** Express 4 with TypeScript, JWT staff sessions, and `pg`
- **Database:** PostgreSQL with SQL schema and seed scripts
- **Language:** TypeScript throughout

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+

### 1. Install dependencies
```bash
(cd fe && npm install)
(cd be && npm install)
```

### 2. Configure environment variables
Copy the example environment files and update the connection details if needed.
```bash
cp fe/.env.example fe/.env.local
cp be/.env.example be/.env
```

### 3. Prepare the database
Create a database (e.g., `brillaracademy`) and run the schema & seed scripts.
```bash
psql "$DATABASE_URL" -f be/db/schema.sql
psql "$DATABASE_URL" -f be/db/seed.sql
```

### 4. Start the development servers
In separate terminals run:

```bash
cd be
npm run dev
```

```bash
cd fe
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) for the front end. The API listens on [http://localhost:4000](http://localhost:4000) by default.

## 🧱 Express API overview

The backend lives in [`be/`](be/) and is a TypeScript Express application. The `createApp` factory in [`be/src/app.ts`](be/src/app.ts) wires middleware (CORS, JSON parsing, logging) and mounts the following route groups under the `/api` prefix:

- `POST /api/login` – student authentication
- `POST /api/admin/login` – IT admin / staff authentication with JWT responses
- `GET /api/features` – feature catalogue for the landing page
- `GET /api/students/public/all` – read-only listing used before authentication
- `GET /api/students` – secured student directory for staff members
- `POST /api/students` – IT admins and student office staff can provision accounts
- `GET /api/students/:id/dashboard` – aggregated dashboard data for a student
- `GET /api/staff` / `POST /api/staff` – IT admins manage staff accounts

The entry point in [`be/src/index.ts`](be/src/index.ts) loads environment variables, ensures the initial IT admin account exists, and then calls `app.listen` so the service is ready for the frontend to consume.

## 🗂️ Project Structure
```
be/                 # Express API with TypeScript source, routes, and DB scripts
  db/               # SQL schema and seed files
  src/              # API entrypoint, routes, services, and middleware
fe/                 # Next.js App Router experience
  app/              # Routes, layouts, and pages
  components/       # Shared UI, segmented by admin/student domains
  lib/              # API client helpers and theme configuration
```

## 📚 Feature Pillars
The landing page spotlights thirteen pillars that define Brillar Academy:
1. Authentication & Profile
2. Academic Dashboard
3. Courses & Learning
4. Assignments & Assessments
5. Grades & Reports
6. Attendance & Schedule
7. Communication & Support
8. Payments & Finance
9. Documents & Forms
10. Academic Planning
11. Career & Internship
12. Admin & Faculty Suite
13. Advanced Enhancements

Each card pulls from PostgreSQL when available, gracefully falling back to curated copy for quick demos.

## 🤝 Contributing
Issues and enhancements are always welcome. Please open a ticket or submit a pull request to collaborate.

## 📄 License
This project is licensed under the MIT License. See the LICENSE file for details.
