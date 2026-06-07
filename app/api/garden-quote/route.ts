import { NextResponse } from "next/server";
import { buildGardenEstimate, calculateLeadScore } from "@/lib/gardenRules";
import { sendGardenerLeadEmail } from "@/lib/email";
import { createSupabaseAdmin } from "@/lib/supabaseServer";
import type {
  AccessType,
  CustomerLeadDetails,
  LeadInsert,
  ServiceNeed,
  Urgency,
  VisitType,
  WasteRemoval
} from "@/lib/types";

export const runtime = "nodejs";

const URGENCIES: Urgency[] = ["ASAP", "This week", "This month", "Just checking"];
const WASTE_OPTIONS: WasteRemoval[] = ["Yes", "No", "Not sure"];
const ACCESS_OPTIONS: AccessType[] = ["Rear access", "Through house", "Not sure"];
const VISIT_TYPES: VisitType[] = [
  "One-off tidy-up",
  "Regular maintenance",
  "Not sure yet"
];
const SERVICE_NEEDS: ServiceNeed[] = [
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
const SUPABASE_UNAVAILABLE_WARNING = "Supabase unavailable, lead not saved.";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const details: CustomerLeadDetails = {
      name: readText(formData, "name"),
      contact: readText(formData, "contact"),
      postcode: readText(formData, "postcode"),
      roughSize: readText(formData, "roughSize"),
      urgency: readChoice(formData, "urgency", URGENCIES),
      wasteRemoval: readChoice(formData, "wasteRemoval", WASTE_OPTIONS),
      access: readChoice(formData, "access", ACCESS_OPTIONS),
      selectedServiceNeeds: readChoices(formData, "selected_service_needs", SERVICE_NEEDS),
      visitType: readChoice(formData, "visit_type", VISIT_TYPES),
      photoStatus: "Photos not collected at this stage"
    };

    if (!details.name || !details.contact || !details.roughSize) {
      return errorResponse("Please add your name, contact detail and rough garden size.", 400);
    }

    const aiResult = buildGardenEstimate(details);
    const leadScore = calculateLeadScore({
      photoCount: 0,
      roughSize: details.roughSize,
      postcode: details.postcode,
      urgency: details.urgency,
      wasteRemoval: details.wasteRemoval,
      access: details.access,
      aiResult
    });
    const finalAiResult = {
      ...aiResult,
      lead_score: leadScore
    };
    const emailSent = await sendGardenerLeadEmail(details, finalAiResult).catch((error) => {
      console.error("Gardener email failed:", error);
      return false;
    });

    const leadId = await optionallySaveLead({
      details,
      finalAiResult
    });

    return NextResponse.json({
      leadId,
      emailSent,
      result: finalAiResult
    });
  } catch (error) {
    console.error(error);
    return errorResponse(
      "Sorry, we could not complete the garden check. Please try again or contact us directly.",
      500
    );
  }
}

async function optionallySaveLead({
  details,
  finalAiResult
}: {
  details: CustomerLeadDetails;
  finalAiResult: LeadInsert["ai_result"];
}) {
  if (process.env.SKIP_SUPABASE === "true") {
    console.warn(SUPABASE_UNAVAILABLE_WARNING);
    return null;
  }

  try {
    const supabase = createSupabaseAdmin();

    const lead: LeadInsert = {
      name: details.name,
      contact: details.contact,
      postcode: details.postcode,
      rough_size: details.roughSize,
      urgency: details.urgency,
      waste_removal: details.wasteRemoval,
      access: details.access,
      status: "New",
      image_paths: [],
      ai_result: finalAiResult,
      customer_reply: finalAiResult.customer_reply,
      visible_issues: finalAiResult.visible_issues,
      estimated_area_sqm: finalAiResult.estimated_area_sqm,
      size_category: finalAiResult.size_category,
      recommended_service: finalAiResult.recommended_service,
      estimated_job_complexity: finalAiResult.estimated_job_complexity,
      starting_price_range: finalAiResult.starting_price_range,
      follow_up_questions: finalAiResult.follow_up_questions,
      lead_score: finalAiResult.lead_score,
      internal_note_for_gardener: finalAiResult.internal_note_for_gardener,
      suggested_gardener_reply: finalAiResult.suggested_gardener_reply
    };

    const { data, error } = await supabase.from("leads").insert(lead).select("id").single();

    if (error) {
      throw new Error(`Supabase lead insert failed: ${error.message}`);
    }

    return data?.id ?? null;
  } catch (error) {
    console.warn(SUPABASE_UNAVAILABLE_WARNING);
    console.error(error);
    return null;
  }
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

function readChoices<T extends string>(formData: FormData, key: string, options: T[]) {
  const values = formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .filter((value): value is T => options.includes(value as T));

  return values.length > 0 ? values : (["Not sure - suggest a service"] as T[]);
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
