alter table public.pedidos
add column if not exists validadoporappbanco text not null default 'no'
check (validadoporappbanco in ('si', 'no'));
