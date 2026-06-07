import type {
  AccessType,
  CustomerLeadDetails,
  GardenAiResult,
  Urgency,
  WasteRemoval
} from "./types";

export function emptyAiResult(overrides: Partial<GardenAiResult> = {}): GardenAiResult {
  return {
    estimate_type: "Rule-based starting estimate",
    photo_status: "Photos not collected at this stage",
    service_zone: "",
    route_fit: "Moderate",
    travel_adjustment: "",
    minimum_booking_guide: "",
    visit_type: "",
    regular_customer_potential: "Low",
    lead_priority: "Low",
    quote_confidence: "Low",
    risk_flags: [],
    customer_reply:
      "Thanks for sending the details. This is a quick starting estimate for Friday garden care around Sutton.",
    selected_service_needs: [],
    budget_friendly_option: "",
    recommended_add_ons: [],
    visible_issues: [],
    estimated_area_sqm: "Needs confirmation",
    size_category: "Unknown",
    recommended_service: "Garden Rescue Visit",
    estimated_job_complexity: "Medium",
    base_price_range: "",
    zone_adjusted_range: "",
    pricing_note: "",
    starting_price_range: "From around \u00a3180-\u00a3280, final quote needed",
    follow_up_questions: [
      "Roughly how many square metres is the garden?",
      "Is there rear access for tools and green waste?",
      "Would you like green waste removed?"
    ],
    lead_score: 0,
    internal_note_for_gardener:
      "Rule-based Sutton Friday route estimate. Review customer details before confirming availability.",
    suggested_gardener_reply:
      "Thanks for sending the details. I currently do garden work on Fridays only, so I can check whether this fits the route and confirm the final quote once I know the exact work, access and waste volume.",
    ...overrides
  };
}

export function normalizeAiResult(value: unknown): GardenAiResult {
  const fallback = emptyAiResult();
  const source = typeof value === "object" && value !== null ? value as Partial<GardenAiResult> : {};

  return {
    estimate_type: stringOr(source.estimate_type, fallback.estimate_type),
    photo_status: stringOr(source.photo_status, fallback.photo_status),
    service_zone: stringOr(source.service_zone, fallback.service_zone),
    route_fit: stringOr(source.route_fit, fallback.route_fit),
    travel_adjustment: stringOr(source.travel_adjustment, fallback.travel_adjustment),
    minimum_booking_guide: stringOr(
      source.minimum_booking_guide,
      fallback.minimum_booking_guide
    ),
    visit_type: stringOr(source.visit_type, fallback.visit_type),
    regular_customer_potential: stringOr(
      source.regular_customer_potential,
      fallback.regular_customer_potential
    ),
    lead_priority: stringOr(source.lead_priority, fallback.lead_priority),
    quote_confidence: stringOr(source.quote_confidence, fallback.quote_confidence),
    risk_flags: stringArrayOr(source.risk_flags, fallback.risk_flags),
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
    base_price_range: stringOr(source.base_price_range, fallback.base_price_range),
    zone_adjusted_range: stringOr(source.zone_adjusted_range, fallback.zone_adjusted_range),
    pricing_note: stringOr(source.pricing_note, fallback.pricing_note),
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

export function buildGardenEstimate(details: CustomerLeadDetails) {
  const zone = getSuttonServiceZone(details.postcode);
  const area = estimateArea(details.roughSize);
  const sizeCategory = area.category;
  const selectedNeeds = details.selectedServiceNeeds;
  const recommendedService = chooseRecommendedService(selectedNeeds);
  const basePrice = getBasePriceRange(recommendedService, sizeCategory, zone.label);
  const adjustedPricing = applyZonePricing(basePrice, zone.label, details.visitType, sizeCategory);
  const isRegular = details.visitType === "Regular maintenance";
  const isOneOff = details.visitType === "One-off tidy-up";
  const isSmall = sizeCategory === "Small" || sizeCategory === "Unknown";
  const riskFlags: string[] = [];

  if (zone.routeFit === "Premium only" && isOneOff && isSmall) {
    riskFlags.push("Far one-off small job may not be suitable unless combined with a larger or regular visit.");
  }

  if (zone.routeFit === "Not usually covered") {
    riskFlags.push("Outside usual Friday route; availability needs confirmation.");
  }

  const budgetOption = buildBudgetOption(selectedNeeds, recommendedService, sizeCategory);
  const addOns = buildRecommendedAddOns(details);
  const regularPotential = getRegularPotential(details, selectedNeeds);
  const leadPriority = getRouteLeadPriority(zone.label, details.visitType, sizeCategory, selectedNeeds);
  const confidence = getQuoteConfidence(zone.label, details, selectedNeeds, sizeCategory);

  return emptyAiResult({
    estimate_type: "Rule-based starting estimate",
    photo_status: "Photos not collected at this stage",
    service_zone: zone.label,
    route_fit: zone.routeFit,
    travel_adjustment: zone.travelAdjustment,
    minimum_booking_guide: zone.minimumBookingGuide,
    visit_type: details.visitType,
    regular_customer_potential: regularPotential,
    lead_priority: leadPriority,
    quote_confidence: confidence,
    risk_flags: riskFlags,
    selected_service_needs: selectedNeeds,
    budget_friendly_option: budgetOption,
    recommended_add_ons: addOns,
    customer_reply: buildCustomerReply(zone.label, details.visitType),
    visible_issues: [],
    estimated_area_sqm: area.areaText,
    size_category: sizeCategory,
    recommended_service: recommendedService,
    estimated_job_complexity: isRegular ? "Medium" : "Standard",
    base_price_range: basePrice.label,
    zone_adjusted_range: adjustedPricing.zoneAdjustedRange,
    pricing_note: adjustedPricing.pricingNote,
    starting_price_range: adjustedPricing.startingPriceRange,
    follow_up_questions: buildFollowUps(details),
    internal_note_for_gardener: buildInternalNote(zone.label, details.visitType, leadPriority),
    suggested_gardener_reply: buildSuggestedReply(zone.label, details.visitType)
  });
}

export function applySuttonRouteRules(
  result: GardenAiResult,
  details: CustomerLeadDetails,
  _photoCount = 0
) {
  const ruleEstimate = buildGardenEstimate(details);

  return {
    ...result,
    estimate_type: ruleEstimate.estimate_type,
    photo_status: ruleEstimate.photo_status,
    starting_price_range: ruleEstimate.starting_price_range,
    service_zone: ruleEstimate.service_zone,
    route_fit: ruleEstimate.route_fit,
    travel_adjustment: ruleEstimate.travel_adjustment,
    minimum_booking_guide: ruleEstimate.minimum_booking_guide,
    visit_type: details.visitType,
    regular_customer_potential: ruleEstimate.regular_customer_potential,
    lead_priority: ruleEstimate.lead_priority,
    quote_confidence: ruleEstimate.quote_confidence,
    risk_flags: mergeUnique(ruleEstimate.risk_flags, result.risk_flags),
    selected_service_needs: details.selectedServiceNeeds,
    budget_friendly_option: ruleEstimate.budget_friendly_option,
    recommended_add_ons: ruleEstimate.recommended_add_ons,
    estimated_area_sqm: ruleEstimate.estimated_area_sqm,
    size_category: ruleEstimate.size_category,
    recommended_service: ruleEstimate.recommended_service,
    estimated_job_complexity: ruleEstimate.estimated_job_complexity,
    base_price_range: ruleEstimate.base_price_range,
    zone_adjusted_range: ruleEstimate.zone_adjusted_range,
    pricing_note: ruleEstimate.pricing_note,
    customer_reply: ruleEstimate.customer_reply,
    internal_note_for_gardener: ruleEstimate.internal_note_for_gardener,
    suggested_gardener_reply: ruleEstimate.suggested_gardener_reply,
    visible_issues: ruleEstimate.visible_issues,
    follow_up_questions: mergeUnique(result.follow_up_questions, ruleEstimate.follow_up_questions).slice(0, 3)
  };
}

export function getSuttonServiceZone(postcode: string) {
  const zoneA = ["SM1", "SM2", "SM3", "SM4", "SM5", "SM6", "KT4", "KT17", "CR4"];
  const zoneB = ["KT18", "KT19", "KT20", "SW19", "SW20", "KT3", "CR0", "CR2", "CR5", "SM7"];
  const zoneC = [
    "SW15",
    "SW18",
    "SW11",
    "SW6",
    "SW10",
    "SW3",
    "SW13",
    "TW9",
    "TW10",
    "KT1",
    "KT2",
    "KT6",
    "KT10",
    "KT11",
    "KT12",
    "SE21",
    "SE22"
  ];
  const outward = extractOutwardCode(postcode, [...zoneA, ...zoneB, ...zoneC]);

  if (zoneA.includes(outward)) {
    return {
      outward,
      label: "Core Sutton route",
      routeFit: "Good",
      travelAdjustment: "£0",
      minimumBookingGuide: "£80-£100"
    };
  }

  if (zoneB.includes(outward)) {
    return {
      outward,
      label: "Extended route",
      routeFit: "Moderate",
      travelAdjustment: "+£15-£35 travel/time allowance may apply",
      minimumBookingGuide: "£150+"
    };
  }

  if (zoneC.includes(outward)) {
    return {
      outward,
      label: "Far premium route",
      routeFit: "Premium only",
      travelAdjustment: "+£35-£60 travel/time allowance may apply",
      minimumBookingGuide: "£250+"
    };
  }

  return {
    outward,
    label: "Outside usual Friday route",
    routeFit: "Not usually covered",
    travelAdjustment: "Needs confirmation",
    minimumBookingGuide: "Quote needed"
  };
}

function extractOutwardCode(postcode: string, knownOutwardCodes: string[]) {
  const normalized = postcode.trim().toUpperCase().replace(/\s+/g, " ");

  if (!normalized) return "";

  if (normalized.includes(" ")) {
    return normalized.split(" ")[0];
  }

  const compact = normalized.replace(/\s/g, "");
  const knownMatch = knownOutwardCodes
    .slice()
    .sort((a, b) => b.length - a.length)
    .find((code) => compact.startsWith(code));

  if (knownMatch) return knownMatch;

  if (/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact)) {
    return compact.slice(0, -3);
  }

  return compact.match(/^[A-Z]{1,2}\d[A-Z\d]?/)?.[0] ?? "";
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

function estimateArea(roughSize: string) {
  const lower = roughSize.toLowerCase();
  const dimensionMatch = lower.match(/(\d+(?:\.\d+)?)\s*m?\s*[x×]\s*(\d+(?:\.\d+)?)/);
  let area: number | null = null;

  if (dimensionMatch) {
    area = Number(dimensionMatch[1]) * Number(dimensionMatch[2]);
  } else {
    const sqmMatch = lower.match(/(\d+(?:\.\d+)?)\s*(sqm|sq m|m2|m²)/);
    if (sqmMatch) area = Number(sqmMatch[1]);
  }

  if (area !== null && Number.isFinite(area)) {
    return {
      areaText: String(Math.round(area)),
      category: categorizeArea(area)
    };
  }

  if (lower.includes("small")) return { areaText: "Needs confirmation", category: "Small" };
  if (lower.includes("medium")) return { areaText: "Needs confirmation", category: "Medium" };
  if (lower.includes("large")) return { areaText: "Needs confirmation", category: "Large" };

  return { areaText: "Needs confirmation", category: "Unknown" };
}

function categorizeArea(area: number) {
  if (area <= 30) return "Small";
  if (area <= 70) return "Medium";
  if (area <= 150) return "Large";
  return "Extra large";
}

function chooseRecommendedService(selectedNeeds: string[]) {
  if (selectedNeeds.includes("Not sure - suggest a service")) return "General garden tidy-up";
  if (selectedNeeds.includes("Overgrown garden clearance")) return "Overgrown garden clearance";
  if (selectedNeeds.includes("Regular garden maintenance")) return "Regular garden maintenance";
  if (selectedNeeds.includes("Fence repair / small outdoor repair")) {
    return "Fence repair / small outdoor repair";
  }
  if (selectedNeeds.length > 1) return selectedNeeds.slice(0, 2).join(" + ");
  return selectedNeeds[0] || "General garden tidy-up";
}

type PriceRange = {
  label: string;
  min?: number;
  max?: number;
  suffix?: string;
  quoteNeeded?: boolean;
};

function getBasePriceRange(service: string, size: string, zoneLabel: string): PriceRange {
  if (zoneLabel === "Outside usual Friday route") {
    return { label: "Quote needed - availability to confirm", quoteNeeded: true };
  }

  if (size === "Extra large") {
    return { label: "Quote needed - likely site review", quoteNeeded: true };
  }

  if (service.includes("Fence repair")) {
    return { label: "Quote needed", quoteNeeded: true };
  }

  const table: Record<string, Record<string, PriceRange>> = {
    "Lawn mowing / grass cutting": {
      Small: range(60, 100),
      Medium: range(90, 150),
      Large: range(150, 250),
      Unknown: range(90, 180, "From around ")
    },
    "Hedge trimming": {
      Small: range(80, 150),
      Medium: range(150, 300),
      Large: from(300, "+ / quote needed"),
      Unknown: range(150, 300, "From around ")
    },
    "Weeding / border tidy": {
      Small: range(70, 120),
      Medium: range(120, 220),
      Large: range(220, 350),
      Unknown: range(120, 220, "From around ")
    },
    "General garden tidy-up": {
      Small: range(120, 180),
      Medium: range(180, 280),
      Large: range(280, 450),
      Unknown: range(180, 280, "From around ")
    },
    "Overgrown garden clearance": {
      Small: range(180, 300),
      Medium: range(300, 500),
      Large: from(500),
      Unknown: range(300, 500, "From around ")
    },
    "Regular garden maintenance": {
      Small: range(60, 100, "", " per visit"),
      Medium: range(90, 160, "", " per visit"),
      Large: { label: "Quote needed", quoteNeeded: true },
      Unknown: range(90, 160, "From around ", " per visit")
    },
    "Jet washing / patio cleaning": {
      Small: range(80, 150),
      Medium: range(150, 280),
      Large: { label: "Quote needed", quoteNeeded: true },
      Unknown: range(150, 280, "From around ")
    },
    "Planting / seasonal refresh": {
      Small: range(80, 180, "", " excluding plants/materials"),
      Medium: range(150, 300, "", " excluding plants/materials"),
      Large: { label: "Quote needed", quoteNeeded: true },
      Unknown: range(150, 300, "From around ", " excluding plants/materials")
    }
  };

  const key = Object.keys(table).find((item) => service.includes(item)) || "General garden tidy-up";
  return table[key][size] ?? table[key].Unknown;
}

function applyZonePricing(
  base: PriceRange,
  zoneLabel: string,
  visitType: string,
  size: string
) {
  if (zoneLabel === "Outside usual Friday route") {
    return {
      zoneAdjustedRange: "Quote needed",
      startingPriceRange: "Quote needed",
      pricingNote: "Outside the usual Friday route. Availability and price need confirmation."
    };
  }

  if (base.quoteNeeded || base.min === undefined) {
    return {
      zoneAdjustedRange: base.label,
      startingPriceRange: base.label,
      pricingNote:
        "This job needs confirmation before pricing because the scope, materials or route fit may vary."
    };
  }

  const baseMax = base.max ?? base.min;

  if (zoneLabel === "Core Sutton route") {
    const label = formatRange(base.min, baseMax, base.suffix);

    return {
      zoneAdjustedRange: label,
      startingPriceRange: label,
      pricingNote: "Core Sutton route: no travel/time allowance added."
    };
  }

  if (zoneLabel === "Extended route") {
    const adjustedMin = base.min + 15;
    const adjustedMax = baseMax + 35;
    const oneOffSmall = visitType === "One-off tidy-up" && size === "Small";
    const finalMin = oneOffSmall ? Math.max(adjustedMin, 150) : adjustedMin;
    const finalMax = oneOffSmall ? Math.max(adjustedMax, 150) : adjustedMax;

    return {
      zoneAdjustedRange: formatRange(adjustedMin, adjustedMax, base.suffix),
      startingPriceRange: formatRange(finalMin, finalMax, base.suffix),
      pricingNote: oneOffSmall
        ? "Extended route: +£15-£35 travel/time allowance included and one-off small jobs usually need a £150+ minimum booking."
        : "Extended route: +£15-£35 travel/time allowance included."
    };
  }

  const adjustedMin = base.min + 35;
  const adjustedMax = baseMax + 60;
  const regularOrLarge =
    visitType === "Regular maintenance" || size === "Large" || size === "Extra large";
  const adjustedLabel = formatRange(adjustedMin, adjustedMax, base.suffix);

  return {
    zoneAdjustedRange: adjustedLabel,
    startingPriceRange: regularOrLarge
      ? `${adjustedLabel}, but minimum booking usually £250+ for this route`
      : "from £250+",
    pricingNote: regularOrLarge
      ? "Far premium route: +£35-£60 travel/time allowance included; Friday route minimum is usually £250+."
      : "Far premium route: small or one-off jobs are usually only suitable from £250+."
  };
}

function range(min: number, max: number, prefix = "", suffix = ""): PriceRange {
  return {
    label: `${prefix}${formatRange(min, max, suffix)}`,
    min,
    max,
    suffix
  };
}

function from(min: number, suffix = "+"): PriceRange {
  return {
    label: `£${min}${suffix}`,
    min,
    suffix
  };
}

function formatRange(min: number, max: number, suffix = "") {
  if (min === max) return `£${min}+${suffix}`;
  return `£${min}-£${max}${suffix}`;
}

function getStartingRange(service: string, size: string, zoneLabel: string) {
  if (zoneLabel === "Outside usual Friday route") return "Quote needed - availability to confirm";
  if (size === "Extra large") return "Quote needed - likely site review";
  if (service.includes("Fence repair")) return "Quote needed";

  const table: Record<string, Record<string, string>> = {
    "Lawn mowing / grass cutting": {
      Small: "£60-£100",
      Medium: "£90-£150",
      Large: "£150-£250",
      Unknown: "From around £90-£180"
    },
    "Hedge trimming": {
      Small: "£80-£150",
      Medium: "£150-£300",
      Large: "£300+ / quote needed",
      Unknown: "From around £150-£300"
    },
    "Weeding / border tidy": {
      Small: "£70-£120",
      Medium: "£120-£220",
      Large: "£220-£350",
      Unknown: "From around £120-£220"
    },
    "General garden tidy-up": {
      Small: "£120-£180",
      Medium: "£180-£280",
      Large: "£280-£450",
      Unknown: "From around £180-£280"
    },
    "Overgrown garden clearance": {
      Small: "£180-£300",
      Medium: "£300-£500",
      Large: "£500+",
      Unknown: "From around £300-£500"
    },
    "Regular garden maintenance": {
      Small: "£60-£100 per visit",
      Medium: "£90-£160 per visit",
      Large: "Quote needed",
      Unknown: "From around £90-£160 per visit"
    },
    "Jet washing / patio cleaning": {
      Small: "£80-£150",
      Medium: "£150-£280",
      Large: "Quote needed",
      Unknown: "From around £150-£280"
    },
    "Planting / seasonal refresh": {
      Small: "£80-£180 excluding plants/materials",
      Medium: "£150-£300 excluding plants/materials",
      Large: "Quote needed",
      Unknown: "From around £150-£300 excluding plants/materials"
    }
  };

  const key = Object.keys(table).find((item) => service.includes(item)) || "General garden tidy-up";
  return table[key][size] ?? table[key].Unknown;
}

function buildBudgetOption(selectedNeeds: string[], service: string, size: string) {
  const budgetNeed = selectedNeeds.some((need) =>
    ["Lawn mowing / grass cutting", "Weeding / border tidy", "General garden tidy-up"].includes(need)
  );

  if (service.includes("Overgrown")) {
    return "A basic lawn cut may not be enough because the garden appears or sounds overgrown. A clearance visit may be needed first.";
  }

  if (budgetNeed && size !== "Extra large") {
    return "Start with the lower-priority basics first, such as lawn mowing, weeding or a light tidy, then quote hedge work or waste removal separately if needed.";
  }

  return "";
}

function buildRecommendedAddOns(details: CustomerLeadDetails) {
  const addOns: string[] = [];

  if (details.wasteRemoval === "Yes" || details.selectedServiceNeeds.includes("Green waste removal")) {
    addOns.push("Green waste removal may change the final quote depending on volume.");
  }

  if (details.visitType === "Regular maintenance") {
    addOns.push("An initial tidy-up may be needed first, then regular maintenance can usually be lower per visit.");
  }

  return addOns;
}

function getRouteLeadPriority(
  zoneLabel: string,
  visitType: string,
  size: string,
  selectedNeeds: string[]
) {
  const regular = visitType === "Regular maintenance";
  const valuable =
    regular ||
    ["Large", "Extra large"].includes(size) ||
    selectedNeeds.includes("Overgrown garden clearance");

  if (zoneLabel === "Core Sutton route") return regular || valuable ? "High" : "Medium";
  if (zoneLabel === "Extended route") return valuable ? "High" : "Medium";
  if (zoneLabel === "Far premium route") return valuable ? "Medium" : "Low";
  return valuable ? "Medium" : "Low";
}

function buildCustomerReply(zoneLabel: string, visitType: string) {
  const estimateNote = "Photos are not needed for this quick starting estimate. The gardener may ask for 1-2 photos on WhatsApp before confirming the final quote.";
  const regularNote =
    visitType === "Regular maintenance"
      ? "Regular maintenance customers are prioritised for the Friday route."
      : "Availability is currently limited to Friday slots.";

  return `${estimateNote} ${regularNote} This is a starting range, not a final quote.`;
}

function buildFollowUps(details: CustomerLeadDetails) {
  const questions: string[] = [];

  if (details.access === "Not sure") questions.push("Is there rear access for tools and waste?");
  if (details.wasteRemoval !== "No") {
    questions.push("Is the green waste normal clippings or larger branches, bags or bulky waste?");
  }

  return questions.slice(0, 3);
}

function buildInternalNote(zoneLabel: string, visitType: string, priority: string) {
  return `Sutton Friday route lead. Zone: ${zoneLabel}. Visit type: ${visitType}. Priority: ${priority}. Check whether this fits a Friday route before confirming.`;
}

function buildSuggestedReply(zoneLabel: string, visitType: string) {
  return `Thanks for sending the details. I currently do garden work on Fridays only. You're in the ${zoneLabel}, so I can check whether it fits the Friday route and confirm the final quote once I know the exact work, access and waste volume.`;
}

function mergeUnique(first: string[], second: string[]) {
  return Array.from(new Set([...first, ...second].filter((item) => item.trim().length > 0)));
}

function getRegularPotential(details: CustomerLeadDetails, selectedNeeds: string[]) {
  if (details.visitType === "Regular maintenance") return "High";
  if (selectedNeeds.includes("Regular garden maintenance")) return "High";
  if (details.visitType === "Not sure yet") return "Medium";
  return "Low";
}

function getQuoteConfidence(
  zoneLabel: string,
  details: CustomerLeadDetails,
  selectedNeeds: string[],
  size: string
) {
  const uncertainSize = size === "Unknown" || details.roughSize.toLowerCase().includes("not sure");
  const materialOrRepair =
    selectedNeeds.includes("Fence repair / small outdoor repair") ||
    selectedNeeds.includes("Planting / seasonal refresh");

  if (
    uncertainSize ||
    materialOrRepair ||
    selectedNeeds.includes("Overgrown garden clearance") ||
    zoneLabel === "Far premium route" ||
    zoneLabel === "Outside usual Friday route" ||
    details.access === "Through house"
  ) {
    return "Low";
  }

  if (
    zoneLabel === "Extended route" ||
    details.wasteRemoval === "Yes" ||
    selectedNeeds.includes("Hedge trimming") ||
    selectedNeeds.includes("General garden tidy-up")
  ) {
    return "Medium";
  }

  return "High";
}
