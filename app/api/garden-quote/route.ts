import { NextResponse } from "next/server";
import { analyzeGardenLead } from "@/lib/openaiGarden";
import { calculateLeadScore } from "@/lib/gardenRules";
import { sendGardenerLeadEmail } from "@/lib/email";
import { createSupabaseAdmin, GARDEN_UPLOAD_BUCKET } from "@/lib/supabaseServer";
import type {
  AccessType,
  CustomerLeadDetails,
  LeadInsert,
  ServiceNeed,
  Urgency,
  WasteRemoval
} from "@/lib/types";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const URGENCIES: Urgency[] = ["ASAP", "This week", "This month", "Just checking"];
const WASTE_OPTIONS: WasteRemoval[] = ["Yes", "No", "Not sure"];
const ACCESS_OPTIONS: AccessType[] = ["Rear access", "Through house", "Not sure"];
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
  "Not sure - let AI suggest"
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
      selectedServiceNeeds: readChoices(formData, "selected_service_needs", SERVICE_NEEDS)
    };
    const files = formData.getAll("photos").filter((value): value is File => value instanceof File);

    if (!details.name || !details.contact || !details.roughSize) {
      return errorResponse("Please add your name, contact detail and rough garden size.", 400);
    }

    if (files.length < 2 || files.length > 4) {
      return errorResponse("Please upload between 2 and 4 garden photos.", 400);
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return errorResponse("Only JPG, PNG and WebP images are accepted.", 400);
      }

      if (file.size > MAX_FILE_SIZE) {
        return errorResponse("Each photo must be 15 MB or less.", 400);
      }
    }

    const preparedImages = await Promise.all(
      files.map(async (file) => {
        const bytes = Buffer.from(await file.arrayBuffer());

        return {
          bytes,
          mimeType: file.type,
          dataUrl: `data:${file.type};base64,${bytes.toString("base64")}`
        };
      })
    );

    const aiResult = await analyzeGardenLead(
      details,
      preparedImages.map(({ dataUrl, mimeType }) => ({ dataUrl, mimeType }))
    );
    const leadScore = calculateLeadScore({
      photoCount: files.length,
      roughSize: details.roughSize,
      postcode: details.postcode,
      urgency: details.urgency,
      wasteRemoval: details.wasteRemoval,
      access: details.access,
      aiResult
    });
    const finalAiResult = {
      ...aiResult,
      selected_service_needs:
        aiResult.selected_service_needs.length > 0
          ? aiResult.selected_service_needs
          : details.selectedServiceNeeds,
      lead_score: leadScore
    };
    const emailSent = await sendGardenerLeadEmail(details, finalAiResult).catch((error) => {
      console.error("Gardener email failed:", error);
      return false;
    });

    const leadId = await optionallySaveLead({
      details,
      preparedImages,
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
  preparedImages,
  finalAiResult
}: {
  details: CustomerLeadDetails;
  preparedImages: Array<{
    bytes: Buffer;
    mimeType: string;
  }>;
  finalAiResult: LeadInsert["ai_result"];
}) {
  if (process.env.SKIP_SUPABASE === "true") {
    console.warn(SUPABASE_UNAVAILABLE_WARNING);
    return null;
  }

  try {
    const supabase = createSupabaseAdmin();
    const imagePaths: string[] = [];
    const leadFolder = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}`;

    for (const [index, image] of preparedImages.entries()) {
      const extension = extensionFor(image.mimeType);
      const path = `${leadFolder}/photo-${index + 1}.${extension}`;
      const { error } = await supabase.storage
        .from(GARDEN_UPLOAD_BUCKET)
        .upload(path, image.bytes, {
          contentType: image.mimeType,
          upsert: false
        });

      if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      imagePaths.push(path);
    }

    const lead: LeadInsert = {
      name: details.name,
      contact: details.contact,
      postcode: details.postcode,
      rough_size: details.roughSize,
      urgency: details.urgency,
      waste_removal: details.wasteRemoval,
      access: details.access,
      status: "New",
      image_paths: imagePaths,
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

  return values.length > 0 ? values : (["Not sure - let AI suggest"] as T[]);
}

function extensionFor(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
