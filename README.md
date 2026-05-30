# Logic Pulse
**Workforce Management System for the Media Department**

## Setup

### 1. Clone and install
```bash
npm install
```

### 2. Environment variables
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://trpbeoyflbtzbmsprjfb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run locally
```bash
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import repo
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## First-time setup after deploy

### Create super admin account
1. Go to Supabase → Authentication → Users → Add user
2. Enter email and password
3. Go to Table Editor → profiles → find the row → change `role` to `super_admin`
4. Sign in at your live URL — you will land on the super admin dashboard

### Supabase settings
- Authentication → Settings → Email confirmations → OFF
- Authentication → Settings → Site URL → set to your Vercel URL

## Pages
- `/` — Landing page
- `/login` — Sign in
- `/onboarding` — New member profile setup
- `/dashboard` — Member dashboard
- `/dashboard/attendance` — Log attendance
- `/dashboard/report` — Service report
- `/dashboard/upload` — LFC certificate upload
- `/dashboard/assessments` — View assessments
- `/admin` — HOD/supervisor dashboard
- `/admin/invite` — Invite members
- `/admin/members/[id]` — Member detail + assessment
- `/super` — Super admin dashboard
- `/super/create-hod` — Create HOD account

## Roles
- `super_admin` — Full system access, manages HODs across all branches
- `head` — Head of Department, manages members in their branch
- `supervisor` — Sub-team lead, manages assigned members
- `volunteer` — Probation member
