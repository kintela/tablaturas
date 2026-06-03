alter table public.tablaturas
add column if not exists precio_venta_centimos_pack integer not null default 0
check (precio_venta_centimos_pack >= 0);
