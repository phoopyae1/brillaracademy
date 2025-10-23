# Brillar Academy Platform

A minimal, beautiful academic experience crafted with Next.js App Router, Material UI, and PostgreSQL.

## ✨ Highlights
- Clean, responsive landing page presenting the thirteen foundational pillars of Brillar Academy.
- App Router architecture with modern server components and streaming-ready data fetching.
- Shared Material UI design system with custom theming for a soft, elegant visual language.
- PostgreSQL-backed feature catalogue with graceful fallback data for local exploration.

## 🧰 Tech Stack
- **Framework:** Next.js 14 (App Router)
- **UI Library:** Material UI 5 with Emotion styling
- **Database:** PostgreSQL (via the official `pg` driver)
- **Language:** TypeScript

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy the example environment file and update the database connection string if needed.
```bash
cp .env.example .env.local
```

### 3. Prepare the database
Create a database (e.g., `brillaracademy`) and run the schema & seed scripts.
```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

### 4. Start the development server
```bash
npm run dev
```
Then open [http://localhost:3000](http://localhost:3000) to view the experience.

## 🗂️ Project Structure
```
app/            # Next.js App Router routes and global styles
components/     # Reusable presentation components
lib/            # Theme configuration and database helpers
db/             # SQL schema and seed files
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
