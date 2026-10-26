# 🏆 EventForm - Dynamic Event Form Builder & Registration Platform

A modern, responsive, high-converting event form builder and public registration platform designed as an advanced alternative to Google Forms. Built with **React 19, TypeScript, Tailwind CSS, Lucide icons, and Supabase**.

Designed specifically for sports tournaments (cricket leagues, football cups), school hackathons, club activities, seminars, and community gatherings.

---

## 🌟 Key Highlights & Capabilities

### 1. Visual Form Builder (No-Code Canvas)
- **20 Supported Field Types**:
  1. Short text
  2. Paragraph / Long text
  3. Email address
  4. Phone / WhatsApp number
  5. Number (with min/max constraints)
  6. Single-choice radio buttons
  7. Multiple-choice checkboxes
  8. Dropdown menu
  9. Date picker
  10. Time picker
  11. Date and Time picker
  12. File upload (PDF, DOCX, ZIP)
  13. Photo upload (with real-time image preview)
  14. Yes / No binary toggle buttons
  15. Section heading (chapter dividers)
  16. Informational text (styled callout box)
  17. Residential address
  18. Website / Portfolio URL
  19. Interactive 1–5 Star rating
  20. Consent & Disclaimer checkbox
- **Reordering, Duplication, & Deletion**: Move questions up/down with live canvas feedback, one-click duplicate questions, and delete questions with ease.
- **Field Inspector Panel**: Dedicated tabs for General settings, Options management, Validation constraints (min/max length, min/max values, file sizes), and Conditional Logic rules.

### 2. Functional Conditional Logic Engine
- **Visual Rule Builder**:
  > *"When [Question] [Condition] [Value], then [Show/Hide] [Target Question]"*
- **Operators**: `equals`, `does not equal`, `contains`, `is empty`, `is not empty`, `greater than`, `less than`.
- **Multi-Condition Rules**: Supports `AND` (all match) and `OR` (any match) logic.
- **Cascading & Nested Dependencies**: Automatically handles nested visibility (if a parent question is hidden, child dependent questions are gracefully hidden as well).
- **Circular Dependency Detection**: Validates rule graphs to prevent infinite dependency loops.
- **Smart Submission Sanitizer**: Hidden fields are automatically excluded from required validation and sanitized before database insertion.

### 3. Event Image, Branding & Custom Themes
- Event poster and cover banner uploads.
- Event start/end date, time, and physical venue specifications.
- Registration deadlines with automated expiration enforcement.
- Curated color palettes (Indigo, Sky Blue, Emerald, Amber, Rose, Violet, Slate).
- Customizable post-submission confirmation messages and optional external URL redirects (e.g. WhatsApp group join).

### 4. High-Converting Mobile-First Public Registration (`/e/:slug`)
- Distraction-free, responsive landing page accessible without participant login.
- Dynamic field rendering with real-time conditional logic evaluation.
- Inline form validation and required-field indicators.
- Celebratory confetti on confirmation with unique submission reference tracking.
- Closed event and expired deadline protection screens.

### 5. Response Management & CSV Export
- Dedicated response management dashboard for each event.
- Live submission counts and status indicators (Confirmed, Pending, Cancelled).
- Full-text search and status filtering.
- Detailed submission modal with photo previews and answer history.
- One-click **Export to CSV** with properly quoted and formatted fields.
- Response deletion with confirmation safeguard.

### 6. Relational Backend Architecture (Supabase PostgreSQL)
- Complete database schema for `profiles`, `forms`, `form_fields`, and `submissions`.
- Row Level Security (RLS) policies guaranteeing public access to published forms only, while protecting unpublished forms and participant data.
- Built-in graceful offline / local storage fallback so the platform functions immediately out of the box even before remote Supabase credentials are plugged in.

---

## 🏗️ Project Architecture & Modular Feature Repositories

The codebase is organized into cleanly decoupled feature modules and a generic UI library:

```
├── src/
│   ├── generic-ui/              # Generic UI Component Library
│   │   ├── Header.tsx           # Global search, notifications, admin profile
│   │   ├── Sidebar.tsx          # Responsive navigation, counters, live preview trigger
│   │   ├── Footer.tsx           # System operational status, platform version
│   │   ├── Layout.tsx           # Reusable app shell layout
│   │   ├── ToastContext.tsx     # Toast notification system
│   │   └── components/
│   │       ├── Button.tsx       # Button variants, sizes, loading states
│   │       ├── Badge.tsx        # Status pills (published, draft, closed)
│   │       ├── Card.tsx         # Card container primitives
│   │       └── Modal.tsx        # Accessible dialog modal with backdrop blur
│   ├── features/
│   │   ├── dashboard/           # Analytics overview & recent activity feed
│   │   ├── forms/               # All forms grid with search, sort, and filters
│   │   ├── builder/             # Visual canvas, palette, inspector, branding modal
│   │   ├── conditional-logic/   # Evaluator engine and visual rule editor
│   │   ├── public-registration/ # Mobile-first event registration page (/e/:slug)
│   │   ├── responses/           # Response table, search, detailed drawer, CSV export
│   │   └── settings/            # Supabase connection diagnostics & SQL generator
│   ├── services/
│   │   ├── storage.ts           # Unified storage layer (Supabase + local fallback)
│   │   ├── supabaseClient.ts    # Supabase client initializer
│   │   └── seedData.ts          # Pre-seeded cricket tournament and hackathon events
│   └── types/
│       └── index.ts             # Comprehensive TypeScript models
```

### Git Feature Branches

The repository contains isolated feature branches corresponding to each core capability:
- `main`: Complete, integrated, production-ready application
- `feature/admin-auth`: Administrator authentication with Supabase Auth, session guards, and login/logout UI
- `feature/generic-ui`: Side menu, header, footer, modal, button, badge, and toast system
- `feature/conditional-logic`: Dynamic reactive evaluation engine & visual rule editor
- `feature/form-builder`: Visual canvas, 20 field types, drag-and-drop reordering, inspector
- `feature/public-registration`: Public mobile-first registration landing page (`/e/:slug`)
- `feature/response-management`: Responses table, CSV export, submission viewer
- `feature/supabase-backend`: Supabase client, schema SQL, RLS policies, and storage configs

### 🔑 Administrator Credentials (Demo Mode)
- **Email**: `admin@eventform.com`
- **Password**: `admin123`
*(Or click **"Fill Demo Admin"** on the login page for 1-click test sign in!)*

---

## 🚀 Quick Start & Local Development

### Prerequisites
- Node.js 20+ or 22+ (LTS)
- npm or pnpm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### 3. Build for Production
```bash
npm run build
```

---

## 🗄️ Supabase PostgreSQL Setup & Deployment

The application runs seamlessly in local mode out of the box, and can be connected to Supabase at any time.

### Step 1: Create a Supabase Project
1. Visit [supabase.com](https://supabase.com) and create a free project.
2. Go to **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://xyzproject.supabase.co`)
   - **anon / public key**

### Step 2: Configure Environment Variables
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
*(Alternatively, you can paste the credentials directly in the app under **Settings** in the Admin Dashboard!)*

### Step 3: Run Database Migrations in Supabase
In your Supabase project, open the **SQL Editor**, click **New query**, paste the SQL script from `src/services/storage.ts` (or copy it with one click from the **Settings** view in the app), and click **Run**.

This will automatically create:
- `profiles`
- `forms` (with indexing on `slug` and `status`)
- `form_fields` (with foreign key cascade)
- `submissions` (with indexing on `form_id` and `submitted_at`)
- Row Level Security (RLS) policies
- Storage bucket `event-assets` for banner uploads

---

## ☁️ Deploying to Vercel (Free Tier)

1. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. Log in to [vercel.com](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. Set Build Command: `npm run build`
5. Set Output Directory: `dist`
6. Add Environment Variables (optional, if using Supabase):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Click **Deploy**. Vercel will provide your live deployment URL (e.g., `https://event-form-platform.vercel.app`).
8. Public event registration links will be accessible at:
   `https://event-form-platform.vercel.app/#/e/kpcl-season-5`

---

## 🏏 Pre-Seeded Demonstration Events Included

1. **Kharghar Premier Cricket League - Season 5 (KPCL)**
   - Demonstrates complete cricket tournament registration logic.
   - Question: *"Are you participating as an active player?"* -> Shows/hides cricket specs.
   - Question: *"Select your player category"* (Batsman, Bowler, All-rounder, Wicketkeeper) -> Dynamically reveals batting style, batting position, bowling arm/style, or wicketkeeping experience.
   - Question: *"Do you need a tournament jersey kit?"* -> Dynamically reveals jersey size, custom jersey number, and back print name.
   - Photo upload, address, and code of conduct consent checkbox.
2. **National Inter-School Robotics & AI Hackathon 2026**
   - Demonstrates team size validation, competition tracks, and GitHub project link submission.
