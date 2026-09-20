create extension if not exists pgcrypto;

create table if not exists public.candidates (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('candidate', 'recruiter')),
  competency_level text,
  overall_competency numeric check (overall_competency >= 0 and overall_competency <= 100),
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  difficulty text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  challenge_count integer not null default 0 check (challenge_count >= 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete restrict,
  status text not null default 'in-progress' check (status in ('in-progress', 'completed', 'expired', 'abandoned')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete restrict,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete restrict,
  overall_score numeric not null check (overall_score between 0 and 100),
  breakdown jsonb not null default '{}'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  improvement_areas jsonb not null default '[]'::jsonb,
  ai_insight text,
  created_at timestamptz not null default now()
);

create table if not exists public.competencies (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  skill_name text not null,
  score numeric not null check (score between 0 and 100),
  updated_at timestamptz not null default now()
);

create table if not exists public.skill_gaps (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  competency_name text not null,
  current_score numeric not null check (current_score between 0 and 100),
  target_score numeric not null check (target_score between 0 and 100)
);

create table if not exists public.practice_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  difficulty text not null,
  estimated_minutes integer not null check (estimated_minutes > 0),
  target_competency text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.career_recommendations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  role_title text not null,
  match_percent numeric not null check (match_percent between 0 and 100),
  matching_competencies jsonb not null default '[]'::jsonb,
  missing_competencies jsonb not null default '[]'::jsonb
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates(id) on delete set null,
  message text not null,
  rating integer check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.field_discovery_responses (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  suggested_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assessment_attempts_candidate_id_idx on public.assessment_attempts(candidate_id);
create index if not exists assessment_results_candidate_id_idx on public.assessment_results(candidate_id);
create index if not exists competencies_candidate_id_idx on public.competencies(candidate_id);
create index if not exists skill_gaps_candidate_id_idx on public.skill_gaps(candidate_id);
create index if not exists career_recommendations_candidate_id_idx on public.career_recommendations(candidate_id);
create unique index if not exists career_recommendations_candidate_role_idx on public.career_recommendations(candidate_id, role_title);
create index if not exists feedback_candidate_id_idx on public.feedback(candidate_id);
create index if not exists field_discovery_responses_candidate_id_idx on public.field_discovery_responses(candidate_id);
create index if not exists challenges_assessment_id_idx on public.challenges(assessment_id);

alter table public.candidates enable row level security;
alter table public.assessments enable row level security;
alter table public.challenges enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_results enable row level security;
alter table public.competencies enable row level security;
alter table public.skill_gaps enable row level security;
alter table public.practice_challenges enable row level security;
alter table public.career_recommendations enable row level security;
alter table public.feedback enable row level security;
alter table public.field_discovery_responses enable row level security;

create policy candidates_own_select on public.candidates for select using (auth.uid() = id);
create policy candidates_own_insert on public.candidates for insert with check (auth.uid() = id);
create policy candidates_own_update on public.candidates for update using (auth.uid() = id) with check (auth.uid() = id);

create policy assessments_public_select on public.assessments for select using (is_active = true);
create policy challenges_public_select on public.challenges for select using (true);
create policy practice_public_select on public.practice_challenges for select using (is_active = true);

create policy attempts_own_all on public.assessment_attempts for all using (auth.uid() = candidate_id) with check (auth.uid() = candidate_id);
create policy results_own_select on public.assessment_results for select using (auth.uid() = candidate_id);
create policy results_own_insert on public.assessment_results for insert with check (auth.uid() = candidate_id);
create policy competencies_own_all on public.competencies for all using (auth.uid() = candidate_id) with check (auth.uid() = candidate_id);
create policy gaps_own_all on public.skill_gaps for all using (auth.uid() = candidate_id) with check (auth.uid() = candidate_id);
create policy recommendations_own_select on public.career_recommendations for select using (auth.uid() = candidate_id);
create policy discovery_own_all on public.field_discovery_responses for all using (auth.uid() = candidate_id) with check (auth.uid() = candidate_id);
create policy feedback_own_select on public.feedback for select using (auth.uid() = candidate_id or candidate_id is null);
create policy feedback_own_insert on public.feedback for insert with check (candidate_id is null or auth.uid() = candidate_id);

-- Assessment results and competency evidence intentionally have no delete policy.

create table if not exists public.user_api_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_key text not null,
  key_status text not null default 'connected',
  updated_at timestamptz not null default now()
);

alter table public.user_api_keys enable row level security;

create policy user_api_keys_own_all on public.user_api_keys for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

