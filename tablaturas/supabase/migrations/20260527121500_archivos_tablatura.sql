create table public.archivos_tablatura (
  id uuid primary key default gen_random_uuid(),
  tablatura_id uuid not null references public.tablaturas(id) on delete cascade,
  tipo_archivo text not null check (tipo_archivo in ('pdf', 'imagen_previa', 'audio', 'zip', 'otro')),
  bucket text not null default 'tablaturas',
  ruta text not null,
  nombre_original text,
  tamano_bytes bigint check (tamano_bytes is null or tamano_bytes >= 0),
  mime_type text,
  es_principal boolean not null default false,
  orden integer not null default 0,
  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now()
);

create index archivos_tablatura_tablatura_id_idx
on public.archivos_tablatura (tablatura_id);

create index archivos_tablatura_tipo_archivo_idx
on public.archivos_tablatura (tipo_archivo);

create unique index archivos_tablatura_tablatura_id_ruta_unica_idx
on public.archivos_tablatura (tablatura_id, ruta);

create unique index archivos_tablatura_un_principal_por_tablatura_idx
on public.archivos_tablatura (tablatura_id)
where es_principal = true;

create trigger actualizar_archivos_tablatura_fecha_modificacion
before update on public.archivos_tablatura
for each row
execute function public.actualizar_fecha_modificacion();

alter table public.archivos_tablatura enable row level security;

create policy "archivos de tablatura visibles para usuarios autenticados"
on public.archivos_tablatura
for select
to authenticated
using (true);
