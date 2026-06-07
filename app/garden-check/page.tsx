"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  buildCustomerWhatsAppSummary,
  buildGardenerInternalSummary,
  formatEstimatedArea,
  getLeadPriority
} from "@/lib/leadSummaries";
import type {
  AccessType,
  CustomerLeadDetails,
  GardenAiResult,
  Urgency,
  WasteRemoval
} from "@/lib/types";

const urgencyOptions: Urgency[] = ["ASAP", "This week", "This month", "Just checking"];
const wasteOptions: WasteRemoval[] = ["Yes", "No", "Not sure"];
const accessOptions: AccessType[] = ["Rear access", "Through house", "Not sure"];
const maxPhotos = 4;
const minPhotos = 2;

export default function GardenCheckPage() {
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GardenAiResult | null>(null);
  const [submittedDetails, setSubmittedDetails] = useState<CustomerLeadDetails | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [previews, setPreviews] = useState<Array<{ name: string; url: string }>>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const nextPreviews = photos.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [photos]);

  async function handlePhotoChange(files: FileList | null) {
    setError("");

    if (!files) return;

    const selected = Array.from(files).slice(0, maxPhotos);
    const invalid = selected.find((file) => !file.type.startsWith("image/"));

    if (invalid) {
      setError("Please upload images only.");
      return;
    }

    const compressed = await Promise.all(selected.map((file) => compressImage(file)));
    setPhotos(compressed);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setSubmittedDetails(null);
    setEmailSent(null);

    if (photos.length < minPhotos || photos.length > maxPhotos) {
      setError("Please upload 2 to 4 garden photos.");
      return;
    }

    setIsSubmitting(true);

    try {
      const form = new FormData(event.currentTarget);
      const details = readSubmittedDetails(form);
      form.delete("photos");
      photos.forEach((photo) => form.append("photos", photo));

      const response = await fetch("/api/garden-quote", {
        method: "POST",
        body: form
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "The garden check could not be completed.");
      }

      setResult(payload.result);
      setSubmittedDetails(details);
      setEmailSent(Boolean(payload.emailSent));
      formRef.current?.reset();
      setPhotos([]);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "The garden check could not be completed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="pt-4 lg:sticky lg:top-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            London garden care
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            AI Garden Quote Assistant
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-ink/75">
            No long forms. Upload photos and get a quick starting range for a tidy-up,
            rescue visit or regular maintenance.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-ink/70 sm:grid-cols-3 lg:grid-cols-1">
            <div className="border-l-4 border-moss bg-white/55 p-4">
              2-4 photos from different angles
            </div>
            <div className="border-l-4 border-moss bg-white/55 p-4">
              Rough size is fine, even if it is a guess
            </div>
            <div className="border-l-4 border-moss bg-white/55 p-4">
              Non-binding range before a final quote
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-soft sm:p-7">
          {!result ? (
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-ink">Quick garden check</h2>
                <p className="mt-2 text-sm text-ink/65">
                  Tell us the basics and add a few photos. The AI check usually takes under a minute.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" name="name" autoComplete="name" required />
                <Field label="Phone or email" name="contact" autoComplete="email" required />
                <Field label="Postcode" name="postcode" autoComplete="postal-code" />
                <Field
                  label="Rough garden size"
                  name="roughSize"
                  placeholder="8m x 5m, 40 sqm, small garden..."
                  required
                />
              </div>

              <ChoiceGroup label="Urgency" name="urgency" options={urgencyOptions} />
              <ChoiceGroup label="Green waste removal" name="wasteRemoval" options={wasteOptions} />
              <ChoiceGroup label="Access" name="access" options={accessOptions} />

              <div>
                <label className="block text-sm font-semibold text-ink">
                  Upload 2-4 garden photos
                </label>
                <label className="mt-2 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-moss/45 bg-paper px-4 py-8 text-center transition hover:border-leaf hover:bg-white">
                  <span className="text-base font-semibold text-leaf">Choose photos</span>
                  <span className="mt-1 text-sm text-ink/60">
                    JPG, PNG or WebP. We shrink large photos before upload where possible.
                  </span>
                  <input
                    className="sr-only"
                    name="photos"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(event) => handlePhotoChange(event.target.files)}
                  />
                </label>

                {previews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {previews.map((preview) => (
                      <div key={preview.url} className="overflow-hidden rounded-md border border-ink/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview.url}
                          alt={preview.name}
                          className="aspect-square w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="focus-ring w-full rounded-md bg-leaf px-5 py-4 text-base font-semibold text-white transition hover:bg-ink disabled:cursor-wait disabled:opacity-70"
              >
                {isSubmitting ? "Checking photos and garden details..." : "Get my starting range"}
              </button>
            </form>
          ) : submittedDetails ? (
            <Result
              result={result}
              details={submittedDetails}
              emailSent={emailSent === true}
              onReset={() => {
                setResult(null);
                setSubmittedDetails(null);
                setEmailSent(null);
              }}
            />
          ) : (
            <div className="text-sm text-ink/70">Loading your result...</div>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  placeholder,
  autoComplete,
  required
}: {
  label: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="focus-ring mt-2 w-full rounded-md border border-ink/15 bg-white px-4 py-3 text-ink placeholder:text-ink/35"
      />
    </label>
  );
}

function ChoiceGroup({
  label,
  name,
  options
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        {options.map((option, index) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-ink/12 bg-paper px-3 py-3 text-sm text-ink transition has-[:checked]:border-leaf has-[:checked]:bg-leaf has-[:checked]:text-white"
          >
            <input
              type="radio"
              name={name}
              value={option}
              defaultChecked={index === 0}
              className="size-4 accent-leaf"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Result({
  result,
  details,
  emailSent,
  onReset
}: {
  result: GardenAiResult;
  details: CustomerLeadDetails;
  emailSent: boolean;
  onReset: () => void;
}) {
  const estimatedArea = formatEstimatedArea(result.estimated_area_sqm);
  const whatsAppSummary = buildCustomerWhatsAppSummary(details, result);
  const gardenerSummary = buildGardenerInternalSummary(details, result);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
          Starting range
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-ink">{result.starting_price_range}</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat label="Service" value={result.recommended_service} />
        <ResultStat label="Garden size" value={result.size_category} />
        <ResultStat label="Estimated area" value={estimatedArea} />
      </div>

      <ResultSection title="Garden condition">
        {result.visible_issues.length > 0 ? (
          <ul className="space-y-2">
            {result.visible_issues.map((issue) => (
              <li key={issue}>- {issue}</li>
            ))}
          </ul>
        ) : (
          <p>The photos give a useful first look, but a few details still need checking.</p>
        )}
      </ResultSection>

      <ResultSection title="Recommended service">
        <p className="font-semibold text-ink">{result.recommended_service}</p>
        <p className="mt-2">
          The job looks like a {result.estimated_job_complexity.toLowerCase()} visit from the
          photos and details provided.
        </p>
      </ResultSection>

      <ResultSection title="Starting range">
        <p className="text-xl font-semibold text-ink">{result.starting_price_range}</p>
      </ResultSection>

      <ResultSection title="Why this range">
        <p>{buildRangeReason(result, estimatedArea)}</p>
      </ResultSection>

      <ResultSection title="A few things to confirm" muted>
        {result.follow_up_questions.length > 0 ? (
          <ul className="space-y-2">
            {result.follow_up_questions.map((question) => (
              <li key={question}>- {question}</li>
            ))}
          </ul>
        ) : (
          <p>Access, waste volume and the exact work can be confirmed before booking.</p>
        )}
      </ResultSection>

      <p className="text-sm leading-6 text-ink/60">
        This is an initial estimate. Final quote depends on access, exact garden size,
        green waste volume and the work required.
      </p>

      <NextStepCard
        emailSent={emailSent}
        whatsAppSummary={whatsAppSummary}
      />

      <GardenerLeadSummaryCard
        details={details}
        result={result}
        estimatedArea={estimatedArea}
        gardenerSummary={gardenerSummary}
      />

      <button
        type="button"
        onClick={onReset}
        className="focus-ring rounded-md border border-leaf px-5 py-3 font-semibold text-leaf transition hover:bg-leaf hover:text-white"
      >
        Check another garden
      </button>
    </div>
  );
}

function NextStepCard({
  emailSent,
  whatsAppSummary
}: {
  emailSent: boolean;
  whatsAppSummary: string;
}) {
  const [copied, setCopied] = useState(false);
  const whatsAppNumber = process.env.NEXT_PUBLIC_GARDENER_WHATSAPP_NUMBER?.trim();
  const whatsAppHref = whatsAppNumber
    ? `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(whatsAppSummary)}`
    : "#";

  return (
    <section className="rounded-md border border-leaf/20 bg-leaf/5 p-4">
      <h3 className="text-lg font-semibold text-ink">Next step</h3>
      <p className="mt-2 text-sm leading-6 text-ink/72">
        This is an initial AI estimate. To confirm the final quote and availability, send
        your garden check to the gardener on WhatsApp.
      </p>
      <p className="mt-3 text-sm text-ink/62">
        {emailSent
          ? "We've also sent your garden check to the gardener."
          : "You can still confirm your quote using WhatsApp below."}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a
          href={whatsAppHref}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => {
            if (!whatsAppNumber) event.preventDefault();
          }}
          className={`focus-ring rounded-md px-5 py-3 text-center font-semibold text-white transition ${
            whatsAppNumber ? "bg-leaf hover:bg-ink" : "cursor-not-allowed bg-ink/30"
          }`}
        >
          Confirm My Quote on WhatsApp
        </a>
        <button
          type="button"
          onClick={() => copyText(whatsAppSummary, setCopied)}
          className="focus-ring rounded-md border border-leaf px-5 py-3 font-semibold text-leaf transition hover:bg-white"
        >
          {copied ? "Copied" : "Copy My Garden Check"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-ink/55">
        No payment or booking is confirmed yet - the gardener will confirm the final quote first.
      </p>
    </section>
  );
}

function GardenerLeadSummaryCard({
  details,
  result,
  estimatedArea,
  gardenerSummary
}: {
  details: CustomerLeadDetails;
  result: GardenAiResult;
  estimatedArea: string;
  gardenerSummary: string;
}) {
  const [copied, setCopied] = useState(false);
  const priority = getLeadPriority(result.lead_score);

  return (
    <section className="rounded-md border border-ink/10 bg-ink/[0.03] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink">Gardener Lead Summary</h3>
          <p className="mt-1 text-sm text-ink/60">Internal-style MVP view for checking the lead.</p>
        </div>
        <button
          type="button"
          onClick={() => copyText(gardenerSummary, setCopied)}
          className="focus-ring rounded-md border border-ink/20 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white"
        >
          {copied ? "Copied" : "Copy gardener summary"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryFact label="Lead score" value={`${result.lead_score}/100`} />
        <SummaryFact label="Priority" value={priority} />
        <SummaryFact label="Customer name" value={details.name} />
        <SummaryFact label="Customer contact" value={details.contact} />
        <SummaryFact label="Postcode" value={details.postcode || "Not provided"} />
        <SummaryFact label="Rough garden size" value={details.roughSize} />
        <SummaryFact label="Estimated area" value={estimatedArea} />
        <SummaryFact label="Size category" value={result.size_category} />
        <SummaryFact label="Urgency" value={details.urgency} />
        <SummaryFact label="Access" value={details.access} />
        <SummaryFact label="Green waste removal" value={details.wasteRemoval} />
        <SummaryFact label="Recommended service" value={result.recommended_service} />
        <SummaryFact label="Starting price range" value={result.starting_price_range} />
      </div>

      <div className="mt-4 space-y-4 text-sm leading-6 text-ink/72">
        <div>
          <p className="font-semibold text-ink">Visible issues</p>
          <ul className="mt-1 space-y-1">
            {result.visible_issues.length > 0 ? (
              result.visible_issues.map((issue) => <li key={issue}>- {issue}</li>)
            ) : (
              <li>- Needs confirmation</li>
            )}
          </ul>
        </div>
        <SummaryText title="Internal note for gardener" body={result.internal_note_for_gardener} />
        <SummaryText title="Suggested gardener reply" body={result.suggested_gardener_reply} />
      </div>
    </section>
  );
}

function ResultSection({
  title,
  children,
  muted = false
}: {
  title: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section className={`rounded-md ${muted ? "bg-paper" : "border border-ink/10"} p-4`}>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-ink/72">{children}</div>
    </section>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-paper p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value || "Not provided"}</p>
    </div>
  );
}

function SummaryText({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1">{body || "Not available"}</p>
    </div>
  );
}

function buildRangeReason(result: GardenAiResult, estimatedArea: string) {
  const condition =
    result.visible_issues[0]?.replace(/\.$/, "") || "the condition visible in the photos";
  const area =
    estimatedArea.toLowerCase().includes("confirm") || estimatedArea.toLowerCase().includes("unknown")
      ? "the garden size still needs confirming"
      : `an estimated area of ${estimatedArea}`;

  return `This range is based on ${area}, ${condition.toLowerCase()}, and the likely time needed for a ${result.estimated_job_complexity.toLowerCase()} job. Access and green waste volume can still change the final quote.`;
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= 2 * 1024 * 1024) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");

  if (!context) return file;

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  let blob: Blob | null = null;

  for (const quality of [0.82, 0.72, 0.62, 0.52]) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (blob && blob.size <= 2 * 1024 * 1024) break;
  }

  if (!blob || blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now()
  });
}

function readSubmittedDetails(formData: FormData): CustomerLeadDetails {
  return {
    name: readText(formData, "name"),
    contact: readText(formData, "contact"),
    postcode: readText(formData, "postcode"),
    roughSize: readText(formData, "roughSize"),
    urgency: readChoice(formData, "urgency", urgencyOptions),
    wasteRemoval: readChoice(formData, "wasteRemoval", wasteOptions),
    access: readChoice(formData, "access", accessOptions)
  };
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readChoice<T extends string>(formData: FormData, key: string, options: T[]) {
  const value = readText(formData, key);

  if (options.includes(value as T)) {
    return value as T;
  }

  return options[0];
}

async function copyText(text: string, setCopied: (value: boolean) => void) {
  try {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  } catch (error) {
    console.error("Copy failed:", error);
  }
}
