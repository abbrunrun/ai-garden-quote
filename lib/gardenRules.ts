import type {
  AccessType,
  GardenAiResult,
  Urgency,
  WasteRemoval
} from "./types";

const DEFAULT_VISIBLE_ISSUES = [
  "The photos give a useful first look, but any unclear areas need checking before quoting."
];

export function emptyAiResult(overrides: Partial<GardenAiResult> = {}): GardenAiResult {
  return {
    customer_reply:
      "Thanks for sending the photos. I can give an initial range from what I can see, but a few details still need checking before a final quote.",
    selected_service_needs: [],
    budget_friendly_option: "",
    recommended_add_ons: [],
    visible_issues: DEFAULT_VISIBLE_ISSUES,
    estimated_area_sqm: "Needs confirmation",
    size_category: "Unknown",
    recommended_service: "Garden Rescue Visit",
    estimated_job_complexity: "Medium",
    starting_price_range: "From around \u00a3180-\u00a3280, final quote needed",
    follow_up_questions: [
      "Roughly how many square metres is the garden?",
      "Is there rear access for tools and green waste?",
      "Would you like green waste removed?"
    ],
    lead_score: 0,
    internal_note_for_gardener:
      "AI response could not be fully parsed. Review photos and customer details before quoting.",
    suggested_gardener_reply:
      "Thanks for sending the photos. From a first look, I can give a starting range, but I will confirm the final quote once I know access, waste volume and the exact work needed.",
    ...overrides
  };
}

export function normalizeAiResult(value: unknown): GardenAiResult {
  const fallback = emptyAiResult();
  const source = typeof value === "object" && value !== null ? value as Partial<GardenAiResult> : {};

  return {
    selected_service_needs: stringArrayOr(
      source.selected_service_needs,
      fallback.selected_service_needs
    ),
    budget_friendly_option: stringOr(
      source.budget_friendly_option,
      fallback.budget_friendly_option
    ),
    recommended_add_ons: stringArrayOr(
      source.recommended_add_ons,
      fallback.recommended_add_ons
    ),
    customer_reply: stringOr(source.customer_reply, fallback.customer_reply),
    visible_issues: stringArrayOr(source.visible_issues, fallback.visible_issues),
    estimated_area_sqm: stringOr(source.estimated_area_sqm, fallback.estimated_area_sqm),
    size_category: stringOr(source.size_category, fallback.size_category),
    recommended_service: stringOr(source.recommended_service, fallback.recommended_service),
    estimated_job_complexity: stringOr(
      source.estimated_job_complexity,
      fallback.estimated_job_complexity
    ),
    starting_price_range: stringOr(source.starting_price_range, fallback.starting_price_range),
    follow_up_questions: stringArrayOr(source.follow_up_questions, fallback.follow_up_questions)
      .slice(0, 3),
    lead_score: numberOr(source.lead_score, fallback.lead_score),
    internal_note_for_gardener: stringOr(
      source.internal_note_for_gardener,
      fallback.internal_note_for_gardener
    ),
    suggested_gardener_reply: stringOr(
      source.suggested_gardener_reply,
      fallback.suggested_gardener_reply
    )
  };
}

export function calculateLeadScore(params: {
  photoCount: number;
  roughSize: string;
  postcode: string;
  urgency: Urgency;
  wasteRemoval: WasteRemoval;
  access: AccessType;
  aiResult: GardenAiResult;
}) {
  let score = 0;
  const lowerSize = params.roughSize.trim().toLowerCase();
  const service = params.aiResult.recommended_service.toLowerCase();
  const complexity = params.aiResult.estimated_job_complexity.toLowerCase();

  if (params.photoCount > 0) score += 25;
  if (params.roughSize.trim()) score += 15;
  if (params.postcode.trim()) score += 20;
  if (params.urgency === "ASAP" || params.urgency === "This week") score += 15;
  if (service.includes("rescue") || service.includes("clearance") || complexity.includes("heavy")) {
    score += 15;
  }
  if (service.includes("regular")) score += 20;
  if (params.wasteRemoval === "Yes") score += 5;
  if (params.access !== "Not sure") score += 5;
  if (!params.postcode.trim()) score -= 15;
  if (lowerSize.includes("not sure") || lowerSize.includes("unknown") || !lowerSize) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringArrayOr(value: unknown, fallback: string[]) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim())
    : fallback;
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
