alter table public.archivos_tablatura
drop constraint if exists archivos_tablatura_tipo_archivo_check;

update public.archivos_tablatura
set tipo_archivo = 'wav'
where tipo_archivo = 'audio';

alter table public.archivos_tablatura
add constraint archivos_tablatura_tipo_archivo_check
check (
  tipo_archivo = any (
    array[
      'pdf'::text,
      'imagen_previa'::text,
      'midi'::text,
      'wav'::text,
      'zip'::text,
      'otro'::text
    ]
  )
);
