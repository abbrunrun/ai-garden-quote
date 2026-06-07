import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import { createSupabaseAdmin, GARDEN_UPLOAD_BUCKET } from "@/lib/supabaseServer";
import type { LeadRecord, LeadStatus } from "@/lib/types";

const statusOptions: LeadStatus[] = ["New", "Need info", "Quoted", "Booked", "Completed"];
const adminCookieName = "garden_admin";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return (
      <AdminShell>
        <div className="rounded-lg bg-white p-6 shadow-soft">
          <h1 className="text-2xl font-semibold text-ink">Admin password missing</h1>
          <p className="mt-3 text-ink/70">
            Add ADMIN_PASSWORD to your environment variables before opening the leads dashboard.
          </p>
        </div>
      </AdminShell>
    );
  }

  const isAuthed = cookies().get(adminCookieName)?.value === adminPassword;

  if (!isAuthed) {
    return (
      <AdminShell>
        <form action={login} className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-soft">
          <h1 className="text-2xl font-semibold text-ink">Gardener dashboard</h1>
          <p className="mt-2 text-sm text-ink/65">Enter the admin password to view leads.</p>
          <label className="mt-6 block">
            <span className="text-sm font-semibold text-ink">Password</span>
            <input
              name="password"
              type="password"
              required
              className="focus-ring mt-2 w-full rounded-md border border-ink/15 px-4 py-3"
            />
          </label>
          <button className="focus-ring mt-5 w-full rounded-md bg-leaf px-5 py-3 font-semibold text-white hover:bg-ink">
            Open leads
          </button>
        </form>
      </AdminShell>
    );
  }

  const leads = await getLeads();

  return (
    <AdminShell>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Private admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Garden leads</h1>
          <p className="mt-2 text-sm text-ink/65">
            Customer details and photos are loaded server-side with short-lived signed URLs.
          </p>
        </div>
        <form action={logout}>
          <button className="focus-ring rounded-md border border-ink/20 px-4 py-2 text-sm font-semibold text-ink hover:bg-white">
            Sign out
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {leads.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-ink/70 shadow-soft">No leads yet.</div>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">{children}</main>;
}

function LeadCard({
  lead
}: {
  lead: LeadRecord & { signed_image_urls: string[] };
}) {
  return (
    <article className="rounded-lg bg-white p-5 shadow-soft">
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-ink/55">{formatDate(lead.created_at)}</p>
              <h2 className="mt-1 text-2xl font-semibold text-ink">{lead.name}</h2>
              <p className="mt-1 text-sm text-ink/70">
                {lead.contact} · {lead.postcode || "No postcode"}
              </p>
            </div>
            <form action={updateLeadStatus} className="flex items-center gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <select
                name="status"
                defaultValue={lead.status}
                className="focus-ring rounded-md border border-ink/15 bg-white px-3 py-2 text-sm"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button className="focus-ring rounded-md bg-leaf px-3 py-2 text-sm font-semibold text-white hover:bg-ink">
                Save
              </button>
            </form>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <LeadFact label="Rough size" value={lead.rough_size} />
            <LeadFact label="Estimated sqm" value={lead.estimated_area_sqm} />
            <LeadFact label="Size category" value={lead.size_category} />
            <LeadFact label="Lead score" value={`${lead.lead_score}/100`} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <InfoBlock title="Recommendation" body={lead.recommended_service} />
            <InfoBlock title="Price range" body={lead.starting_price_range} />
            <InfoBlock title="Internal note" body={lead.internal_note_for_gardener} />
            <InfoBlock title="Suggested reply" body={lead.suggested_gardener_reply} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <LeadFact label="Urgency" value={lead.urgency} />
            <LeadFact label="Waste removal" value={lead.waste_removal} />
            <LeadFact label="Access" value={lead.access} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Uploaded images</p>
          <div className="grid grid-cols-2 gap-2">
            {lead.signed_image_urls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-md border border-ink/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-square w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function LeadFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-paper p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value || "Not provided"}</p>
    </div>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-md border border-ink/10 p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink/72">{body || "Not available"}</p>
    </section>
  );
}

async function getLeads() {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Unable to load leads: ${error.message}`);
  }

  const leads = (data ?? []) as LeadRecord[];

  return Promise.all(
    leads.map(async (lead) => {
      const urls = await Promise.all(
        (lead.image_paths ?? []).map(async (path) => {
          const { data: signed } = await supabase.storage
            .from(GARDEN_UPLOAD_BUCKET)
            .createSignedUrl(path, 60 * 60);
          return signed?.signedUrl ?? "";
        })
      );

      return {
        ...lead,
        signed_image_urls: urls.filter(Boolean)
      };
    })
  );
}

async function login(formData: FormData) {
  "use server";

  const password = String(formData.get("password") ?? "");

  if (password === process.env.ADMIN_PASSWORD) {
    cookies().set(adminCookieName, password, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/admin",
      maxAge: 60 * 60 * 8
    });
  }

  revalidatePath("/admin/leads");
}

async function logout() {
  "use server";

  cookies().delete(adminCookieName);
  revalidatePath("/admin/leads");
}

async function updateLeadStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;

  if (!id || !statusOptions.includes(status)) return;

  const supabase = createSupabaseAdmin();
  await supabase.from("leads").update({ status }).eq("id", id);
  revalidatePath("/admin/leads");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
