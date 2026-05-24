# Angel Glez COT Store

Next.js storefront for selling digital teaching files with a real server-side backend layer.

## Backend

Sensitive actions run through Next API routes instead of trusting browser-side Supabase writes:

- `/api/admin/session` creates an HTTP-only admin session cookie.
- `/api/admin/products` handles admin product CRUD and ZIP manifest caching.
- `/api/admin/payments` handles payment review, status changes, proof cleanup, and sold counts.
- `/api/checkout` uploads payment proof and creates purchase rows.
- `/api/purchases` loads buyer purchases by email.
- `/api/download` verifies an approved purchase before creating an R2 signed download URL.

For production, set `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` in your host environment. Local development still supports the previous admin password if `ADMIN_PASSWORD` is missing, but production requires real secrets.

## Getting Started

Copy `.env.local.example` to `.env.local` and fill in the values, then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Database Tables

The backend expects these Supabase resources:

- `products`
- `purchases`
- `product_zip_entries`
- Storage bucket: `payment-proofs`
- Cloudflare R2 bucket for product files and thumbnails

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
