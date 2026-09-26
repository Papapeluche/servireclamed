alter table public.ars_catalog add column rnc text;
update public.ars_catalog set rnc = '401501015' where nombre = 'ARS CMD';

alter table public.export_templates add column categorias jsonb not null default '[]'::jsonb;
