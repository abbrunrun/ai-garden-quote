"use client";

import { FormEvent, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  buildCustomerWhatsAppSummary,
  buildGardenerInternalSummary,
  formatEstimatedArea,
} from "@/lib/leadSummaries";
import type {
  AccessType,
  CustomerLeadDetails,
  GardenAiResult,
  ServiceNeed,
  Urgency,
  VisitType,
  WasteRemoval
} from "@/lib/types";

const urgencyOptions: Urgency[] = ["ASAP", "This week", "This month", "Just checking"];
const wasteOptions: WasteRemoval[] = ["Yes", "No", "Not sure"];
const accessOptions: AccessType[] = ["Rear access", "Through house", "Not sure"];
const visitTypeOptions: VisitType[] = [
  "One-off tidy-up",
  "Regular maintenance",
  "Not sure yet"
];
const serviceNeedOptions: ServiceNeed[] = [
  "Lawn mowing / grass cutting",
  "Hedge trimming",
  "Weeding / border tidy",
  "General garden tidy-up",
  "Overgrown garden clearance",
  "Green waste removal",
  "Regular garden maintenance",
  "Jet washing / patio cleaning",
  "Fence repair / small outdoor repair",
  "Planting / seasonal refresh",
  "Not sure - suggest a service"
];

export default function GardenCheckPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GardenAiResult | null>(null);
  const [submittedDetails, setSubmittedDetails] = useState<CustomerLeadDetails | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setSubmittedDetails(null);
    setEmailSent(null);

    setIsSubmitting(true);

    try {
      const form = new FormData(event.currentTarget);
      const details = readSubmittedDetails(form);

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
            Get a quick starting range for garden care around Sutton and nearby areas.
          </p>
          <p className="mt-3 max-w-lg text-sm leading-6 text-ink/65">
            Limited Friday garden care slots available. Regular maintenance customers are prioritised.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-ink/70 sm:grid-cols-3 lg:grid-cols-1">
            <div className="border-l-4 border-moss bg-white/55 p-4">
              Friday availability around Sutton
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
                  Tell us the basics and get a rule-based starting estimate. The final quote is confirmed on WhatsApp.
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
              <VisitTypeGroup />
              <ChoiceGroup label="Green waste removal" name="wasteRemoval" options={wasteOptions} />
              <ChoiceGroup label="Access" name="access" options={accessOptions} />
              <ServiceNeedsGroup />

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
                {isSubmitting ? "Checking route and starting range..." : "Get my starting range"}
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

function VisitTypeGroup() {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">
        What kind of help are you looking for?
      </legend>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {visitTypeOptions.map((option, index) => (
          <label
            key={option}
            className="flex min-h-[72px] cursor-pointer items-center justify-center rounded-xl border border-ink/12 bg-paper px-4 py-3 text-center text-sm font-semibold text-ink transition hover:border-leaf hover:bg-white has-[:checked]:border-leaf has-[:checked]:bg-leaf has-[:checked]:text-white"
          >
            <input
              type="radio"
              name="visit_type"
              value={option}
              defaultChecked={index === 0}
              className="sr-only"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink/60">
        Regular maintenance means fortnightly or monthly garden care.
      </p>
    </fieldset>
  );
}

function ServiceNeedsGroup() {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">What do you need help with?</legend>
      <p className="mt-1 text-sm text-ink/60">
        Choose one or more. If you're not sure, we can suggest a practical starting service.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {serviceNeedOptions.map((option) => (
          <label
            key={option}
            className="flex min-h-[58px] cursor-pointer items-center gap-3 rounded-lg border border-ink/12 bg-paper px-3 py-3 text-sm text-ink transition hover:border-leaf hover:bg-white has-[:checked]:border-leaf has-[:checked]:bg-leaf has-[:checked]:text-white"
          >
            <input
              type="checkbox"
              name="selected_service_needs"
              value={option}
              className="size-4 shrink-0 accent-leaf"
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
  const selectedServices = getSelectedServices(details, result);

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

      <ResultSection title="Selected services">
        <p>{selectedServices.join(", ")}</p>
      </ResultSection>

      <div className="grid gap-3 sm:grid-cols-2">
        <ResultStat label="Visit type" value={details.visitType} />
        <ResultStat label="Service zone" value={result.service_zone} />
        <ResultStat label="Route fit" value={result.route_fit} />
        <ResultStat label="Travel adjustment" value={result.travel_adjustment} />
        <ResultStat label="Minimum booking" value={result.minimum_booking_guide} />
        <ResultStat label="Quote confidence" value={result.quote_confidence} />
      </div>

      <ResultSection title="Friday availability note" muted>
        <p>Availability is currently limited to Friday slots.</p>
        <p className="mt-2">{getZoneMessage(result.service_zone)}</p>
      </ResultSection>

      <ResultSection title="Recommended service">
        <p className="font-semibold text-ink">{result.recommended_service}</p>
        <p className="mt-2">
          This is based on the selected services, garden size, postcode route, access,
          green waste and urgency.
        </p>
      </ResultSection>

      <ResultSection title="Starting range">
        <p className="text-xl font-semibold text-ink">{result.starting_price_range}</p>
      </ResultSection>

      {result.budget_friendly_option && (
        <ResultSection title="Budget-friendly option">
          <p>{result.budget_friendly_option}</p>
        </ResultSection>
      )}

      {result.recommended_add_ons.length > 0 && (
        <ResultSection title="Recommended add-ons">
          <ul className="space-y-2">
            {result.recommended_add_ons.map((addOn) => (
              <li key={addOn}>- {addOn}</li>
            ))}
          </ul>
        </ResultSection>
      )}

      <ResultSection title="Why this range">
        <p>{buildRangeReason(result, estimatedArea)}</p>
      </ResultSection>

      <ResultSection title="What could change the final quote">
        <ul className="space-y-2">
          <li>- Access, exact garden size, green waste volume and work required.</li>
          <li>- Travel/time allowance: {result.travel_adjustment || "Needs confirmation"}.</li>
          <li>- Minimum booking guide: {result.minimum_booking_guide || "Needs confirmation"}.</li>
          <li>- Pricing note: {result.pricing_note || "Needs confirmation"}.</li>
        </ul>
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
      <p className="text-sm leading-6 text-ink/60">
        Photos are not needed for this quick starting estimate. The gardener may ask for
        1-2 photos on WhatsApp before confirming the final quote.
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
        This is an initial rule-based estimate. To confirm the final quote and availability, send
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
  const priority = result.lead_priority || "Low";

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
        <SummaryFact label="Visit type" value={details.visitType} />
        <SummaryFact label="Access" value={details.access} />
        <SummaryFact label="Green waste removal" value={details.wasteRemoval} />
        <SummaryFact label="Selected services" value={getSelectedServices(details, result).join(", ")} />
        <SummaryFact label="Friday route fit" value={result.route_fit} />
        <SummaryFact label="Service zone" value={result.service_zone} />
        <SummaryFact label="Travel adjustment" value={result.travel_adjustment} />
        <SummaryFact label="Minimum booking guide" value={result.minimum_booking_guide} />
        <SummaryFact label="Regular customer potential" value={result.regular_customer_potential} />
        <SummaryFact label="Quote confidence" value={result.quote_confidence} />
        <SummaryFact label="Recommended service" value={result.recommended_service} />
        <SummaryFact label="Base price range" value={result.base_price_range} />
        <SummaryFact label="Zone-adjusted range" value={result.zone_adjusted_range} />
        <SummaryFact label="Starting price range" value={result.starting_price_range} />
        <SummaryFact label="Pricing note" value={result.pricing_note} />
        <SummaryFact
          label="Budget-friendly option"
          value={result.budget_friendly_option || "Not provided"}
        />
      </div>

      <div className="mt-4 space-y-4 text-sm leading-6 text-ink/72">
        <div>
          <p className="font-semibold text-ink">Risk flags</p>
          <ul className="mt-1 space-y-1">
            {result.risk_flags.length > 0 ? (
              result.risk_flags.map((flag) => <li key={flag}>- {flag}</li>)
            ) : (
              <li>- No major route flags</li>
            )}
          </ul>
        </div>
        <SummaryText
          title="Photos"
          body="Not collected at this stage. Ask customer for 1-2 garden photos on WhatsApp if needed before confirming final quote."
        />
        {result.recommended_add_ons.length > 0 && (
          <div>
            <p className="font-semibold text-ink">Recommended add-ons</p>
            <ul className="mt-1 space-y-1">
              {result.recommended_add_ons.map((addOn) => (
                <li key={addOn}>- {addOn}</li>
              ))}
            </ul>
          </div>
        )}
        {result.follow_up_questions.length > 0 && (
          <div>
            <p className="font-semibold text-ink">Follow-up questions</p>
            <ul className="mt-1 space-y-1">
              {result.follow_up_questions.map((question) => (
                <li key={question}>- {question}</li>
              ))}
            </ul>
          </div>
        )}
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

function readSubmittedDetails(formData: FormData): CustomerLeadDetails {
  return {
    name: readText(formData, "name"),
    contact: readText(formData, "contact"),
    postcode: readText(formData, "postcode"),
    roughSize: readText(formData, "roughSize"),
    urgency: readChoice(formData, "urgency", urgencyOptions),
    wasteRemoval: readChoice(formData, "wasteRemoval", wasteOptions),
    access: readChoice(formData, "access", accessOptions),
    selectedServiceNeeds: readServiceNeeds(formData),
    visitType: readChoice(formData, "visit_type", visitTypeOptions),
    photoStatus: "Photos not collected at this stage"
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

function readServiceNeeds(formData: FormData): ServiceNeed[] {
  const values = formData
    .getAll("selected_service_needs")
    .filter((value): value is string => typeof value === "string")
    .filter((value): value is ServiceNeed => serviceNeedOptions.includes(value as ServiceNeed));

  return values.length > 0 ? values : ["Not sure - suggest a service"];
}

function getSelectedServices(details: CustomerLeadDetails, result: GardenAiResult) {
  return result.selected_service_needs.length > 0
    ? result.selected_service_needs
    : details.selectedServiceNeeds;
}

function getZoneMessage(serviceZone: string) {
  if (serviceZone === "Core Sutton route") {
    return "You're within the core Sutton route, so this is a good fit for Friday availability.";
  }

  if (serviceZone === "Extended route") {
    return "You're in an extended route area. This can still be a good fit, especially for regular maintenance or larger jobs.";
  }

  if (serviceZone === "Far premium route") {
    return "You're in a farther premium route area. This is usually best for regular maintenance, larger gardens or higher-value jobs.";
  }

  return "You may be outside the usual Friday route. The gardener can review availability on WhatsApp.";
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
