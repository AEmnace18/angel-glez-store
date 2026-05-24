-- Product reviews are written only through /api/reviews after the server verifies
-- the buyer has an approved purchase for the product.
create extension if not exists pgcrypto;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id bigint not null,
  purchase_id text not null unique,
  buyer_name text not null default 'Teacher',
  buyer_email text not null,
  rating integer not null check (rating between 1 and 5),
  review_text text not null check (char_length(trim(review_text)) between 3 and 700),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_reviews_product_id_created_at_idx
  on public.product_reviews (product_id, created_at desc);

create index if not exists product_reviews_purchase_id_idx
  on public.product_reviews (purchase_id);

create or replace function public.set_product_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_reviews_set_updated_at on public.product_reviews;

create trigger product_reviews_set_updated_at
before update on public.product_reviews
for each row
execute function public.set_product_reviews_updated_at();

alter table public.product_reviews enable row level security;
