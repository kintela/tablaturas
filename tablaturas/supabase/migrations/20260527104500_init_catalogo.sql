create extension if not exists pgcrypto;

create or replace function public.actualizar_fecha_modificacion()
returns trigger
language plpgsql
as $$
begin
  new.fecha_actualizacion = now();
  return new;
end;
$$;

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null,
  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  constraint grupos_nombre_unico unique (nombre),
  constraint grupos_slug_unico unique (slug)
);

create table public.tablaturas (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  titulo_cancion text not null,
  slug text not null,
  descripcion text,
  precio_venta_centimos integer not null default 0 check (precio_venta_centimos >= 0),
  moneda text not null default 'EUR' check (char_length(moneda) = 3),
  bucket_archivo text not null default 'tablaturas',
  ruta_archivo text,
  url_imagen_portada text,
  publicada boolean not null default false,
  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  constraint tablaturas_slug_unico_por_grupo unique (grupo_id, slug)
);

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tablatura_id uuid not null references public.tablaturas(id) on delete restrict,
  importe_pagado_centimos integer not null check (importe_pagado_centimos >= 0),
  moneda text not null default 'EUR' check (char_length(moneda) = 3),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagada', 'fallida', 'reembolsada')),
  proveedor_pago text,
  referencia_pago text,
  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  fecha_pago timestamptz,
  constraint compras_referencia_pago_unica unique (referencia_pago)
);

create unique index compras_una_pagada_por_usuario_y_tablatura_idx
on public.compras (usuario_id, tablatura_id)
where estado = 'pagada';

create index tablaturas_grupo_id_idx on public.tablaturas (grupo_id);
create index tablaturas_publicada_idx on public.tablaturas (publicada);
create index tablaturas_titulo_cancion_idx on public.tablaturas (titulo_cancion);
create index compras_usuario_id_idx on public.compras (usuario_id);
create index compras_tablatura_id_idx on public.compras (tablatura_id);
create index compras_estado_idx on public.compras (estado);

create trigger actualizar_grupos_fecha_modificacion
before update on public.grupos
for each row
execute function public.actualizar_fecha_modificacion();

create trigger actualizar_tablaturas_fecha_modificacion
before update on public.tablaturas
for each row
execute function public.actualizar_fecha_modificacion();

create trigger actualizar_compras_fecha_modificacion
before update on public.compras
for each row
execute function public.actualizar_fecha_modificacion();

alter table public.grupos enable row level security;
alter table public.tablaturas enable row level security;
alter table public.compras enable row level security;

create policy "grupos visibles para todo el mundo"
on public.grupos
for select
to anon, authenticated
using (true);

create policy "tablaturas visibles cuando estan publicadas"
on public.tablaturas
for select
to anon, authenticated
using (publicada = true);

create policy "usuarios autenticados pueden ver sus compras"
on public.compras
for select
to authenticated
using (auth.uid() = usuario_id);

create policy "usuarios autenticados pueden crear sus compras pendientes"
on public.compras
for insert
to authenticated
with check (auth.uid() = usuario_id and estado = 'pendiente');
