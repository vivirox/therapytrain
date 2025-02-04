-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create sessions table
create table if not exists public.sessions (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users not null,
    payload jsonb default '{}'::jsonb,
    status text default 'active'::text check (status in ('active', 'paused', 'completed', 'cancelled')),
    metadata jsonb default '{}'::jsonb
);

-- Create messages table
create table if not exists public.messages (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    session_id uuid references public.sessions not null,
    user_id uuid references auth.users not null,
    payload jsonb default '{}'::jsonb,
    type text not null check (type in ('text', 'system', 'ai', 'action')),
    metadata jsonb default '{}'::jsonb
);

-- Create indexes
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_status on public.sessions(status);
create index if not exists idx_sessions_created_at on public.sessions(created_at);
create index if not exists idx_messages_session_id on public.messages(session_id);
create index if not exists idx_messages_created_at on public.messages(created_at);
create index if not exists idx_messages_payload on public.messages using gin (payload jsonb_path_ops);
create index if not exists idx_sessions_payload on public.sessions using gin (payload jsonb_path_ops);

-- Add RLS policies for sessions
alter table public.sessions enable row level security;

create policy "Users can view their own sessions"
    on public.sessions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
    on public.sessions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own active sessions"
    on public.sessions for update
    using (auth.uid() = user_id and status = 'active')
    with check (auth.uid() = user_id);

-- Add RLS policies for messages
alter table public.messages enable row level security;

create policy "Users can view messages in their sessions"
    on public.messages for select
    using (
        exists (
            select 1
            from public.sessions
            where sessions.id = messages.session_id
            and sessions.user_id = auth.uid()
        )
    );

create policy "Users can insert messages in their active sessions"
    on public.messages for insert
    with check (
        exists (
            select 1
            from public.sessions
            where sessions.id = messages.session_id
            and sessions.user_id = auth.uid()
            and sessions.status = 'active'
        )
    );

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger for sessions
create trigger set_sessions_updated_at
    before update on public.sessions
    for each row
    execute function public.handle_updated_at();

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on public.sessions to authenticated;
grant all on public.messages to authenticated;
grant usage, select on sequence public.sessions_id_seq to authenticated;
grant usage, select on sequence public.messages_id_seq to authenticated;
