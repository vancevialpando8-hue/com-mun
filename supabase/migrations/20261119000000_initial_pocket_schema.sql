create table if not exists public.profiles (
  id text primary key,
  display_name text not null,
  xp integer not null default 240,
  referrals integer not null default 0,
  wallet_address text,
  wallet_pnl text not null default '0.0',
  avatar_key text,
  member_status text not null default 'Scout',
  created_at timestamptz not null default now()
);

create table if not exists public.active_users (
  id text primary key references public.profiles(id) on delete cascade,
  wallet_address text unique,
  display_name text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.communities (
  id text primary key,
  name text not null unique,
  tag text not null,
  motto text not null,
  privacy text not null check (privacy in ('public', 'private')),
  owner_id text not null,
  member_count integer not null default 1,
  capacity integer not null default 50,
  score integer not null default 0,
  tier text not null default 'bronze' check (tier in ('bronze', 'silver', 'gold', 'diamond')),
  icon_key text,
  weekly_pnl text not null default '0.0',
  integrity_status text not null default '0 integrity flags',
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  community_id text not null references public.communities(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  role text not null default 'new_member' check (role in ('leader', 'co_leader', 'elder', 'new_member')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create unique index if not exists memberships_user_id_unique on public.memberships(user_id);
create table if not exists public.join_requests (id text primary key, community_id text not null references public.communities(id) on delete cascade, user_id text not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), unique (community_id, user_id));
create table if not exists public.callouts (id text primary key, community_id text not null references public.communities(id) on delete cascade, author_id text not null references public.profiles(id) on delete cascade, ticker text not null, thesis text not null, created_at timestamptz not null default now());
create table if not exists public.community_messages (id text primary key, community_id text not null references public.communities(id) on delete cascade, author_id text not null references public.profiles(id) on delete cascade, body text not null, created_at timestamptz not null default now());
create table if not exists public.battles (id text primary key, challenger_community_id text not null references public.communities(id) on delete cascade, opponent_community_id text not null references public.communities(id) on delete cascade, created_by text not null references public.profiles(id) on delete cascade, status text not null default 'active' check (status in ('active', 'complete')), prize_points integer not null default 1200, ends_at timestamptz not null, created_at timestamptz not null default now());
create table if not exists public.challenge_completions (challenge_id text not null, user_id text not null references public.profiles(id) on delete cascade, completed_at timestamptz not null default now(), primary key (challenge_id, user_id));

create index if not exists communities_score_idx on public.communities(score desc, created_at desc);
create index if not exists memberships_community_idx on public.memberships(community_id);
create index if not exists callouts_community_idx on public.callouts(community_id, created_at desc);
create index if not exists messages_community_idx on public.community_messages(community_id, created_at desc);
create index if not exists battles_status_idx on public.battles(status, created_at desc);
create index if not exists active_users_last_seen_idx on public.active_users(last_seen_at desc);

alter table public.profiles enable row level security;
alter table public.active_users enable row level security;
alter table public.communities enable row level security;
alter table public.memberships enable row level security;
alter table public.join_requests enable row level security;
alter table public.callouts enable row level security;
alter table public.community_messages enable row level security;
alter table public.battles enable row level security;
alter table public.challenge_completions enable row level security;

insert into storage.buckets (id, name, public)
values ('community-media', 'community-media', true)
on conflict (id) do update set public = excluded.public;
