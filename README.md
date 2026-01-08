# HRP Learning Hub

A dual-purpose learning management app for UST HealthProof & HealthEdge. Supports both trainers (L&D team) and learners with features for engagement, tracking, and collaboration.

## Features

### For Trainers
- **Daily Check-in**: Mark attendance and status (in office, remote, in session)
- **Team Q&A Board**: Post questions, share tips, collaborate with team
- **Training Tracker**: Log sessions, track metrics, view delivery stats
- **Learner Questions**: Answer questions from learners

### For Learners
- **My Learning**: Track progress, view courses, earn badges
- **Ask a Trainer**: Submit questions and get expert answers
- **Resources**: Access job aids, guides, and quick references
- **Training Calendar**: View and enroll in upcoming sessions

### Shared
- **Dashboard**: Role-based overview with stats and quick actions
- **Announcements**: Stay updated with news and updates
- **Training Calendar**: View all scheduled sessions

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Hosting**: Render
- **Version Control**: GitHub

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/hrp-learning-hub.git
cd hrp-learning-hub
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Settings > API** and copy your project URL and anon key

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Deployment to Render

### Option 1: Using render.yaml (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repo to Render
3. Render will auto-detect `render.yaml` and configure the service
4. Add environment variables in Render dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Option 2: Manual Setup

1. Create a new **Static Site** on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add environment variables
5. Deploy!

## Project Structure

```
hrp-learning-hub/
├── src/
│   ├── components/        # Reusable UI components
│   ├── context/           # React context (Auth)
│   ├── layouts/           # Page layouts
│   ├── lib/               # Utilities (Supabase client)
│   ├── pages/
│   │   ├── auth/          # Login, Register
│   │   ├── trainer/       # Trainer-specific pages
│   │   ├── learner/       # Learner-specific pages
│   │   └── ...            # Shared pages
│   ├── App.jsx            # Main app with routing
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
├── supabase/
│   └── schema.sql         # Database schema
├── .env.example           # Environment template
├── render.yaml            # Render deployment config
└── README.md
```

## User Roles

| Role | Access |
|------|--------|
| **Learner** | Dashboard, My Learning, Ask a Trainer, Resources, Calendar, Announcements |
| **Trainer** | All learner features + Check-in, Team Q&A, Training Tracker, Learner Questions |
| **Manager** | All trainer features + Admin capabilities |

## Supabase Setup Notes

### Authentication
- Email/password auth is enabled by default
- Users are assigned roles during registration
- Profiles are auto-created via database trigger

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies control data access by role
- Review `schema.sql` to customize policies

### Adding Sample Data

After running the schema, you can add sample data:

```sql
-- Add sample trainings
INSERT INTO trainings (title, description, category, duration_minutes, training_type) VALUES
('Claims Processing Basics', 'Introduction to claims workflow in HRP', 'claims', 60, 'facilitator_led'),
('Enrollment Deep Dive', 'Advanced enrollment procedures', 'enrollment', 90, 'blended'),
('Provider Data Management', 'Managing provider information', 'provider_data', 45, 'elearning');

-- Add sample resources
INSERT INTO resources (title, description, category, resource_type, is_public) VALUES
('Claims Quick Reference', 'One-page guide for common claims tasks', 'claims', 'job_aid', true),
('Enrollment Checklist', 'Step-by-step enrollment process', 'enrollment', 'checklist', true);
```

## Customization

### Branding
- Update colors in `tailwind.config.js`
- Replace logo in `MainLayout.jsx`
- Update app name in `index.html`

### Adding Features
- Create new pages in `src/pages/`
- Add routes in `App.jsx`
- Add navigation items in `MainLayout.jsx`

## Support

For questions or issues, contact your L&D team administrator.

---

Built with ❤️ for UST HealthProof & HealthEdge
