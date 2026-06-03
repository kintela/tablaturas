drop index if exists public.compras_una_pagada_por_usuario_y_tablatura_idx;

alter table public.compras
add column if not exists tipo_compra text not null default 'pdf'
check (tipo_compra in ('pdf', 'pack'));

create unique index if not exists compras_una_pagada_por_usuario_tablatura_y_tipo_idx
on public.compras (usuario_id, tablatura_id, tipo_compra)
where estado = 'pagada';
