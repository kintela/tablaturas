alter table public.compras
drop constraint if exists compras_referencia_pago_unica;

alter table public.compras
drop column if exists proveedor_pago,
drop column if exists referencia_pago;

