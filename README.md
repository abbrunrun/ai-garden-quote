# AI Garden Quote Assistant

MVP web app for a London gardening business. Customers upload garden photos, add basic job details, and receive an AI-generated, non-binding garden care recommendation with a starting price range. The gardener can review leads in a private admin dashboard.

## Features

- Customer page at `/garden-check`
- Upload 2-4 garden photos
- Browser-side image compression to roughly under 2 MB where possible
- Server-side image validation
- Optional private Supabase Storage uploads to `garden-uploads`
- OpenAI Responses API vision analysis using base64 data URLs
- Safe fallback if AI JSON parsing fails
- Full lead saved to the `leads` table when Supabase is enabled
- Customer WhatsApp CTA with copyable garden check summary
- Gardener email notification through Resend
- MVP gardener lead summary card after the customer result
- Password-protected admin dashboard at `/admin/leads`
- Signed private image URLs for admin previews
- Lead status updates: New, Need info, Quoted, Booked, Completed

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4.1-mini
NEXT_PUBLIC_SUPABASE_URL=https://ivfhasfnckbcmqagmrgq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ADMIN_PASSWORD=choose_a_strong_admin_password
SKIP_SUPABASE=true
NEXT_PUBLIC_GARDENER_WHATSAPP_NUMBER=447712345678
RESEND_API_KEY=your_resend_api_key
GARDENER_EMAIL=gardener@example.com
EMAIL_FROM=AI Garden Quote <onboarding@resend.dev>
```

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for browser exposure. `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_PASSWORD` are used only server-side.

Set `SKIP_SUPABASE=true` when Supabase is unavailable. The customer flow will still read uploaded images from the request, send base64 data URLs to OpenAI, and show the AI result. Leads and images will not be saved while this flag is enabled.

Set `NEXT_PUBLIC_GARDENER_WHATSAPP_NUMBER` to the gardener's WhatsApp number in international format without `+`, spaces or punctuation. Example: `447712345678`.

Email notifications use Resend. Add `RESEND_API_KEY`, `GARDENER_EMAIL`, and `EMAIL_FROM` to send the gardener a lead email after each AI result. Email sending is server-side only and does not block the customer result if Resend is unavailable or misconfigured.

## Supabase Table

The app expects a `leads` table with these columns:

```sql
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  contact text not null,
  postcode text,
  rough_size text not null,
  urgency text not null,
  waste_removal text not null,
  access text not null,
  status text not null default 'New',
  image_paths text[] not null default '{}',
  ai_result jsonb not null default '{}'::jsonb,
  customer_reply text,
  visible_issues text[] not null default '{}',
  estimated_area_sqm text,
  size_category text,
  recommended_service text,
  estimated_job_complexity text,
  starting_price_range text,
  follow_up_questions text[] not null default '{}',
  lead_score integer not null default 0,
  internal_note_for_gardener text,
  suggested_gardener_reply text
);

alter table public.leads enable row level security;
```

The app uses the Supabase service role key in server-side API routes and admin server components, so browser users do not need direct table permissions. Keep the `garden-uploads` bucket private. If Supabase is unavailable and `SKIP_SUPABASE` is not enabled, the customer will still receive the AI result; the server logs `Supabase unavailable, lead not saved.` and skips persistence.

## Local Development

```bash
npm install
npm run dev
```

Then open:

- Customer page: `http://localhost:3000/garden-check`
- Admin page: `http://localhost:3000/admin/leads`

## Vercel Deployment

1. Push this project to a Git provider.
2. Create a new Vercel project and import the repository.
3. Add all environment variables from `.env.example` in Vercel Project Settings.
4. Make sure `OPENAI_MODEL` is set, for example `gpt-4.1-mini`.
5. Deploy.
6. Visit `/garden-check` for customers and `/admin/leads` for the private dashboard.

The implementation sends OpenAI the uploaded images as base64 data URLs from the server route. This avoids public Supabase URLs and works with the private `garden-uploads` bucket.

The customer result includes a WhatsApp button that opens `wa.me` with a prefilled garden check summary, plus copy buttons for both customer and gardener summaries. If the gardener email sends successfully, the customer sees a small confirmation note; otherwise the page simply points them to WhatsApp.

## WhatsApp Cloud API Future Integration

Good next steps:

- Add `whatsapp_opt_in boolean` and `whatsapp_phone text` columns to `leads`.
- Send the gardener a WhatsApp notification when a high-score lead arrives.
- Send customers an approved template message after form submission.
- Store WhatsApp conversation IDs or message IDs against each lead.
- Add webhook handling for replies, then update lead status to `Need info`, `Quoted`, or `Booked` from message events.

Keep WhatsApp API tokens server-side only, just like the OpenAI and Supabase service role keys.
