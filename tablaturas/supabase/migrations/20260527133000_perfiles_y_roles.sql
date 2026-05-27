create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  apellidos text,
  movil text,
  rol text not null default 'cliente' check (rol in ('admin', 'cliente')),
  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now()
);

create index perfiles_rol_idx on public.perfiles (rol);
create index perfiles_email_idx on public.perfiles (email);

create trigger actualizar_perfiles_fecha_modificacion
before update on public.perfiles
for each row
execute function public.actualizar_fecha_modificacion();

create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.crear_perfil_usuario();

alter table public.perfiles enable row level security;

create policy "usuarios autenticados pueden ver su perfil"
on public.perfiles
for select
to authenticated
using (auth.uid() = id);

create policy "usuarios autenticados pueden actualizar su perfil"
on public.perfiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id and rol = (select rol from public.perfiles where id = auth.uid()));

