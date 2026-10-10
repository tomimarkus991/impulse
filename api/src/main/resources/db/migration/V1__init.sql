create table app_user (
    id               bigserial primary key,
    google_sub       text        not null unique,
    email            text        not null,
    name             text,
    created_at       timestamptz not null default now(),
    last_snapshot_at timestamptz
);

-- Snapshot rows are bulk inserted, so ids come from sequences Hibernate can batch (allocation size 50)
create sequence event_seq increment by 50;
create sequence preset_seq increment by 50;

create table event (
    id       bigint primary key default nextval('event_seq'),
    user_id  bigint      not null references app_user on delete cascade,
    local_id int         not null,
    title    text        not null,
    color    text        not null,
    start_at timestamptz not null,
    end_at   timestamptz not null,
    locked   boolean     not null default false
);

create index event_user_start_idx on event (user_id, start_at);

create table preset (
    id       bigint primary key default nextval('preset_seq'),
    user_id  bigint  not null references app_user on delete cascade,
    local_id int     not null,
    title    text    not null,
    color    text    not null,
    locked   boolean not null default false,
    pinned   boolean not null default false,
    position int     not null default 0
);

create index preset_user_idx on preset (user_id);
