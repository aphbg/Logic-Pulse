-- ============================================================
-- LOGIC MEDIA TRACKER — CLEAN MIGRATION
-- New Supabase project: https://trpbeoyflbtzbmsprjfb.supabase.co
-- Paste entire file into SQL Editor and Run once
-- ============================================================

-- 0. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- 1. ORGANISATIONS
create table organisations (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

insert into organisations (name, slug)
values ('Logic Church', 'logic-church');

-- 2. PROFILES
create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  org_id              uuid not null references organisations(id) on delete cascade,
  full_name           text not null default '',
  phone               text,
  address             text,
  date_of_birth       date,
  photo_url           text,
  sub_team            text check (sub_team in ('camera','roving','live_streaming','lighting','multimedia')),
  role                text not null default 'volunteer'
                        check (role in ('super_admin','head','supervisor','volunteer')),
  status              text not null default 'probation'
                        check (status in ('probation','active','inactive','released')),
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, org_id, full_name, role, status, onboarding_complete)
  values (
    new.id,
    (select id from organisations where slug = 'logic-church' limit 1),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'volunteer'),
    'active',
    false
  ON CONFLICT (id) DO NOTHING
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 3. INVITES
create table invites (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organisations(id) on delete cascade,
  email       text not null,
  invited_by  uuid references profiles(id),
  sub_team    text check (sub_team in ('camera','roving','live_streaming','lighting','multimedia')),
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  status      text not null default 'pending'
                check (status in ('pending','accepted','expired')),
  expires_at  timestamptz not null default now() + interval '48 hours',
  created_at  timestamptz not null default now()
);

-- 4. PROBATION CASES
create table probation_cases (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references profiles(id) on delete cascade,
  created_by          uuid not null references profiles(id),
  status              text not null default 'active'
                        check (status in ('active','at_risk','critical','extended','complete','released')),
  start_date          date not null default current_date,
  end_date            date not null default current_date + interval '8 weeks',
  extended_until      date,
  reason              text,
  attendance_score    numeric(5,2),
  punctuality_score   numeric(5,2),
  checkin_score       numeric(5,2),
  overall_score       numeric(5,2),
  lfc_uploaded        boolean not null default false,
  lfc_confirmed       boolean not null default false,
  lfc_certificate_url text,
  decision            text check (decision in ('approved','extended','released')),
  decision_by         uuid references profiles(id),
  decision_at         timestamptz,
  decision_note       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index one_active_case_per_user
  on probation_cases (user_id)
  where status not in ('complete','released');

-- 5. PASS CRITERIA
create table pass_criteria (
  id                    uuid primary key default uuid_generate_v4(),
  org_id                uuid not null references organisations(id) on delete cascade unique,
  min_attendance_pct    numeric(5,2) not null default 80,
  min_punctuality_pct   numeric(5,2) not null default 75,
  min_checkin_rate      numeric(5,2) not null default 87.5,
  min_supervisor_rating text not null default 'good'
                          check (min_supervisor_rating in ('needs_improvement','fair','good','excellent')),
  lfc_required          boolean not null default true,
  updated_by            uuid references profiles(id),
  updated_at            timestamptz not null default now()
);

insert into pass_criteria (org_id)
select id from organisations where slug = 'logic-church';

-- 6. SERVICES
create table services (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references organisations(id) on delete cascade,
  name         text not null,
  service_date date not null,
  start_time   time not null,
  sub_team     text,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

insert into services (org_id, name, service_date, start_time)
select
  (select id from organisations where slug = 'logic-church'),
  s.name,
  (current_date + (s.days_ahead || ' days')::interval)::date,
  s.start_time::time
from (values
  ('Sunday First Service',   ((7 - extract(dow from current_date)::int) % 7)::text,   '07:00'),
  ('Sunday Second Service',  ((7 - extract(dow from current_date)::int) % 7)::text,   '09:30'),
  ('Wednesday Bible Study',  ((3 - extract(dow from current_date)::int + 7) % 7)::text,'17:00'),
  ('Friday Prayer Meeting',  ((5 - extract(dow from current_date)::int + 7) % 7)::text,'17:30')
) as s(name, days_ahead, start_time);

-- 7. ATTENDANCE LOGS
create table attendance_logs (
  id           uuid primary key default uuid_generate_v4(),
  case_id      uuid not null references probation_cases(id) on delete cascade,
  service_id   uuid not null references services(id),
  arrived_at   timestamptz not null default now(),
  punctuality  text not null default 'on_time'
                 check (punctuality in ('early','on_time','late')),
  minutes_diff integer,
  logged_at    timestamptz not null default now(),
  unique (case_id, service_id)
);

-- 8. CHECKIN QUESTIONS
create table checkin_questions (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references organisations(id) on delete cascade,
  question_text text not null,
  answer_type   text not null default 'text'
                  check (answer_type in ('text','yes_no','rating')),
  display_order int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

insert into checkin_questions (org_id, question_text, answer_type, display_order)
select
  (select id from organisations where slug = 'logic-church'),
  q.question_text, q.answer_type, q.display_order
from (values
  ('How would you rate your overall engagement this week?', 'rating', 1),
  ('Did you complete all assigned tasks for your sub-team?', 'yes_no', 2),
  ('Were you present and on time for all required services?', 'yes_no', 3),
  ('Any challenges, conflicts, or concerns to report this week?', 'text', 4),
  ('What is one thing you learned or improved on this week?', 'text', 5)
) as q(question_text, answer_type, display_order);

-- 9. CHECKIN SUBMISSIONS
create table checkin_submissions (
  id           uuid primary key default uuid_generate_v4(),
  case_id      uuid not null references probation_cases(id) on delete cascade,
  week_number  integer not null,
  answers      jsonb not null default '{}',
  submitted_at timestamptz not null default now(),
  unique (case_id, week_number)
);

-- 10. SUPERVISOR ASSESSMENTS
create table supervisor_assessments (
  id               uuid primary key default uuid_generate_v4(),
  case_id          uuid not null references probation_cases(id) on delete cascade,
  supervisor_id    uuid not null references profiles(id),
  service_id       uuid references services(id),
  week_number      integer,
  overall_rating   text not null default 'pending'
                     check (overall_rating in ('pending','needs_improvement','fair','good','excellent')),
  punctuality_ok   boolean,
  attitude_ok      boolean,
  teamwork_ok      boolean,
  behavioural_flag boolean not null default false,
  flag_note        text,
  notes            text,
  assessed_at      timestamptz not null default now()
);

-- 11. SUPERVISOR ASSIGNMENTS
create table supervisor_assignments (
  id            uuid primary key default uuid_generate_v4(),
  supervisor_id uuid not null references profiles(id) on delete cascade,
  volunteer_id  uuid not null references profiles(id) on delete cascade,
  assigned_by   uuid references profiles(id),
  assigned_at   timestamptz not null default now(),
  unique (supervisor_id, volunteer_id)
);

-- 12. BADGES
create table badges (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text not null default 'ti-award',
  colour      text not null default '#6B46C1'
);

insert into badges (slug, name, description, icon, colour) values
  ('first_service',      'First Service',      'Attended your first service',                    'ti-star',           '#F6AD55'),
  ('week_4_streak',      '4-Week Streak',       'Attended every service for 4 consecutive weeks', 'ti-flame',          '#FC8181'),
  ('punctuality_star',   'Punctuality Star',    'Arrived early or on time 8 services in a row',  'ti-clock-check',    '#68D391'),
  ('checkin_champion',   'Check-in Champion',   'Submitted all 8 weekly check-ins on time',      'ti-clipboard-check','#9F7AEA'),
  ('lfc_certified',      'LFC Certified',       'Logic Foundation Class certificate confirmed',  'ti-certificate',    '#4299E1'),
  ('probation_complete', 'Probation Complete',  'Successfully completed the 2-month probation',  'ti-shield-check',   '#6B46C1');

create table volunteer_badges (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  badge_id   uuid not null references badges(id),
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

-- 13. FUTURE MODULE STUBS
create table rosters (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organisations(id),
  service_id      uuid not null references services(id),
  user_id         uuid not null references profiles(id),
  role_in_service text,
  dress_code      text,
  confirmed       boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (service_id, user_id)
);

create table announcements (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references organisations(id),
  created_by uuid not null references profiles(id),
  title      text not null,
  body       text not null,
  audience   text not null default 'all'
               check (audience in ('all','probation','active','sub_team')),
  sub_team   text,
  created_at timestamptz not null default now()
);

-- 14. ROW LEVEL SECURITY
alter table profiles               enable row level security;
alter table invites                 enable row level security;
alter table probation_cases        enable row level security;
alter table pass_criteria          enable row level security;
alter table services               enable row level security;
alter table attendance_logs        enable row level security;
alter table checkin_questions      enable row level security;
alter table checkin_submissions    enable row level security;
alter table supervisor_assessments enable row level security;
alter table supervisor_assignments enable row level security;
alter table volunteer_badges       enable row level security;
alter table rosters                enable row level security;
alter table announcements          enable row level security;

-- Helper functions
create or replace function get_my_role()
returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function get_my_case_id()
returns uuid language sql security definer stable as $$
  select id from probation_cases
  where user_id = auth.uid()
  and status not in ('complete','released')
  limit 1
$$;

create or replace function is_my_volunteer(volunteer_uuid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from supervisor_assignments
    where supervisor_id = auth.uid()
    and volunteer_id = volunteer_uuid
  )
$$;

-- PROFILES policies
create policy "head sees all profiles"
  on profiles for select using (get_my_role() in ('super_admin','head'));
create policy "supervisor sees own and assigned"
  on profiles for select
  using (get_my_role() = 'supervisor' and (id = auth.uid() or is_my_volunteer(id)));
create policy "volunteer sees own profile"
  on profiles for select using (id = auth.uid());
create policy "users update own profile"
  on profiles for update using (id = auth.uid());
create policy "head updates any profile"
  on profiles for update using (get_my_role() in ('super_admin','head'));

-- INVITES policies
create policy "head and supervisor manage invites"
  on invites for all using (get_my_role() in ('head','supervisor'));

-- PROBATION CASES policies
create policy "head manages all cases"
  on probation_cases for all using (get_my_role() in ('super_admin','head'));
create policy "supervisor sees assigned cases"
  on probation_cases for select
  using (get_my_role() = 'supervisor' and is_my_volunteer(user_id));
create policy "volunteer sees own case"
  on probation_cases for select using (user_id = auth.uid());

-- PASS CRITERIA policies
create policy "everyone reads criteria"
  on pass_criteria for select using (auth.role() = 'authenticated');
create policy "head manages criteria"
  on pass_criteria for all using (get_my_role() in ('super_admin','head'));

-- SERVICES policies
create policy "everyone reads services"
  on services for select using (auth.role() = 'authenticated');
create policy "head manages services"
  on services for all using (get_my_role() in ('super_admin','head'));

-- ATTENDANCE policies
create policy "head sees all attendance"
  on attendance_logs for select using (get_my_role() in ('super_admin','head'));
create policy "supervisor sees assigned attendance"
  on attendance_logs for select
  using (get_my_role() = 'supervisor' and
    exists (select 1 from probation_cases pc
            where pc.id = attendance_logs.case_id
            and is_my_volunteer(pc.user_id)));
create policy "volunteer logs own attendance"
  on attendance_logs for insert
  with check (case_id = get_my_case_id());
create policy "volunteer sees own attendance"
  on attendance_logs for select using (case_id = get_my_case_id());

-- CHECKIN QUESTIONS policies
create policy "everyone reads active questions"
  on checkin_questions for select using (is_active = true);
create policy "head manages questions"
  on checkin_questions for all using (get_my_role() in ('super_admin','head'));

-- CHECKIN SUBMISSIONS policies
create policy "head sees all submissions"
  on checkin_submissions for select using (get_my_role() in ('super_admin','head'));
create policy "supervisor sees assigned submissions"
  on checkin_submissions for select
  using (get_my_role() = 'supervisor' and
    exists (select 1 from probation_cases pc
            where pc.id = checkin_submissions.case_id
            and is_my_volunteer(pc.user_id)));
create policy "volunteer submits own checkins"
  on checkin_submissions for insert
  with check (case_id = get_my_case_id());
create policy "volunteer sees own submissions"
  on checkin_submissions for select using (case_id = get_my_case_id());

-- SUPERVISOR ASSESSMENTS policies
create policy "head sees all assessments"
  on supervisor_assessments for all using (get_my_role() in ('super_admin','head'));
create policy "supervisor manages own assessments"
  on supervisor_assessments for all
  using (get_my_role() = 'supervisor' and supervisor_id = auth.uid());

-- VOLUNTEER BADGES policies
create policy "everyone sees badges"
  on volunteer_badges for select using (auth.role() = 'authenticated');
create policy "head awards badges"
  on volunteer_badges for insert
  with check (get_my_role() in ('super_admin','head'));

-- ROSTERS policies
create policy "everyone reads rosters"
  on rosters for select using (auth.role() = 'authenticated');
create policy "head manages rosters"
  on rosters for all using (get_my_role() in ('super_admin','head'));

-- ANNOUNCEMENTS policies
create policy "everyone reads announcements"
  on announcements for select using (auth.role() = 'authenticated');
create policy "head manages announcements"
  on announcements for all using (get_my_role() in ('super_admin','head'));

-- 15. STORAGE BUCKETS
insert into storage.buckets (id, name, public)
values ('lfc-certificates', 'lfc-certificates', false);

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true);

create policy "volunteers upload certificate"
  on storage.objects for insert
  with check (bucket_id = 'lfc-certificates' and auth.role() = 'authenticated');

create policy "authenticated read certificates"
  on storage.objects for select
  using (bucket_id = 'lfc-certificates' and auth.role() = 'authenticated');

create policy "anyone reads profile photos"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "users upload photo"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos' and auth.role() = 'authenticated');

-- ============================================================
-- DONE. 15 tables. 3 roles. All policies. Clean database.
-- Project: https://trpbeoyflbtzbmsprjfb.supabase.co
-- ============================================================

-- ============================================================
-- CRITICAL: Grant Supabase Auth permission to write to profiles
-- Without these lines, user creation will fail with database error
-- ============================================================
ALTER FUNCTION handle_new_user() SECURITY DEFINER SET search_path = public;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON profiles TO supabase_auth_admin;
GRANT ALL ON organisations TO supabase_auth_admin;
GRANT ALL ON invites TO supabase_auth_admin;
