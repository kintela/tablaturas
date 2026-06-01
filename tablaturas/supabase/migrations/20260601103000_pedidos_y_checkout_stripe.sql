create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  importe_total_centimos integer not null check (importe_total_centimos >= 0),
  moneda text not null default 'EUR' check (char_length(moneda) = 3),
  estado text not null default 'pendiente' check (
    estado in ('pendiente', 'pagado', 'fallido', 'cancelado', 'reembolsado')
  ),
  proveedor_pago text,
  referencia_pago text,
  checkout_session_id text,
  payment_intent_id text,
  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  fecha_pago timestamptz,
  constraint pedidos_referencia_pago_unica unique (referencia_pago),
  constraint pedidos_checkout_session_id_unica unique (checkout_session_id),
  constraint pedidos_payment_intent_id_unica unique (payment_intent_id)
);

alter table public.compras
add column if not exists pedido_id uuid references public.pedidos(id) on delete set null;

create index if not exists pedidos_usuario_id_idx
on public.pedidos (usuario_id);

create index if not exists pedidos_estado_idx
on public.pedidos (estado);

create index if not exists pedidos_fecha_creacion_idx
on public.pedidos (fecha_creacion desc);

create index if not exists compras_pedido_id_idx
on public.compras (pedido_id);

drop trigger if exists actualizar_pedidos_fecha_modificacion on public.pedidos;

create trigger actualizar_pedidos_fecha_modificacion
before update on public.pedidos
for each row
execute function public.actualizar_fecha_modificacion();

alter table public.pedidos enable row level security;

drop policy if exists "usuarios autenticados pueden ver sus pedidos" on public.pedidos;
create policy "usuarios autenticados pueden ver sus pedidos"
on public.pedidos
for select
to authenticated
using (auth.uid() = usuario_id);

drop policy if exists "usuarios autenticados pueden crear sus pedidos pendientes" on public.pedidos;
create policy "usuarios autenticados pueden crear sus pedidos pendientes"
on public.pedidos
for insert
to authenticated
with check (
  auth.uid() = usuario_id
  and estado = 'pendiente'
);
