import { requireEnv } from "./env";
import { emptyAiResult, normalizeAiResult } from "./gardenRules";
import type { CustomerLeadDetails, GardenAiResult } from "./types";

type ImageInput = {
  dataUrl: string;
  mimeType: string;
};

export async function analyzeGardenLead(
  details: CustomerLeadDetails,
  images: ImageInput[]
): Promise<GardenAiResult> {
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("OPENAI_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.2,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: SYSTEM_PROMPT
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildUserPrompt(details)
              },
              ...images.map((image) => ({
                type: "input_image",
                detail: "auto",
                image_url: image.dataUrl
              }))
            ]
          }
        ],
        text: {
          format: GARDEN_RESULT_SCHEMA
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
    }

    const payload = await response.json();
    const text = extractResponseText(payload);
    return normalizeAiResult(JSON.parse(text));
  } catch (error) {
    console.error(error);
    return emptyAiResult({
      selected_service_needs: details.selectedServiceNeeds,
      internal_note_for_gardener:
        "AI analysis failed or returned invalid JSON. Use photos and form details to manually qualify this lead."
    });
  }
}

const SYSTEM_PROMPT = `
You are helping a local London gardener reply to a customer. Analyse the garden photos and form details.
Return only valid JSON with these exact keys:
{
  "selected_service_needs": [],
  "budget_friendly_option": "",
  "recommended_add_ons": [],
  "customer_reply": "",
  "visible_issues": [],
  "estimated_area_sqm": "",
  "size_category": "",
  "recommended_service": "",
  "estimated_job_complexity": "",
  "starting_price_range": "",
  "follow_up_questions": [],
  "lead_score": 0,
  "internal_note_for_gardener": "",
  "suggested_gardener_reply": ""
}

Rules:
- Write like a practical local London gardener: simple, friendly, plain English, not glossy, not robotic.
- Consider customer-selected service needs, garden photos, rough garden size, access, green waste removal and urgency together.
- If the customer selects specific services, prioritise those services unless photos clearly show a mismatch.
- If the customer selects "Not sure - let AI suggest", infer the best service from the photos.
- If the customer selects a budget-friendly service such as lawn mowing, weeding or basic tidy-up, do not automatically upsell to a full garden tidy-up unless the photos show the garden is too overgrown for the simpler service.
- If the customer selects lawn mowing only but the garden looks heavily overgrown, explain that it may need an overgrown garden clearance first.
- If the customer selects hedge trimming, ask about hedge height and green waste volume if unclear.
- If the customer selects green waste removal, treat it as an add-on unless it is the main requested service.
- If the customer selects fence repair / small outdoor repair, do not give a fixed price. Say it needs confirmation because panels, posts, fixings, materials and damage level affect the quote.
- If photos suggest large trees, unsafe work, electrical work or structural repair, recommend specialist inspection and do not auto-quote.
- Always give a starting range, not a final fixed quote.
- Final quote depends on garden size, access, green waste volume and exact work required.
- Keep customer wording modest. Do not overclaim from photos. If something is not clearly visible, say it needs confirmation.
- Ask no more than 3 follow-up questions.
- Convert dimensions such as "8m x 5m" into square metres.
- Size categories: Small 0-30 sqm, Medium 31-70 sqm, Large 71-150 sqm, Extra large 150+ sqm.
- If the area is unknown, give a wider range and ask a size follow-up.
- If heavily overgrown, increase complexity by one level.
- If green waste removal is needed, mention it may increase price.
- If green waste removal = Yes, ask whether the waste is only normal grass clippings or larger waste such as branches, hedge cuttings, bags of debris, or overgrown plant material.
- If the garden looks in good condition but green waste removal = Yes, still mention that waste volume may change the final quote.
- If there is no rear access, mention final quote needs confirmation.
- The customer_reply should be short and natural, around 2-4 sentences.
- Include practical reasons for the range in visible_issues and internal_note_for_gardener.

Service packages:
- Lawn mowing / grass cutting
- Hedge trimming
- Weeding / border tidy
- General garden tidy-up
- Overgrown garden clearance
- Green waste removal
- Regular garden maintenance
- Jet washing / patio cleaning
- Fence repair / small outdoor repair
- Planting / seasonal refresh

London MVP pricing:
- Standard labour guide: around £35/hour
- Minimum visit/call-out: £60-£90
- Complex, heavy or two-person jobs should use wider ranges.
- Lawn mowing / grass cutting: Small £60-£100, Medium £90-£150, Large £150-£250
- Hedge trimming: Small £80-£150, Medium £150-£300, Large £300+ / quote needed
- Weeding / border tidy: Small £70-£120, Medium £120-£220, Large £220-£350
- General garden tidy-up: Small £120-£180, Medium £180-£280, Large £280-£450
- Overgrown garden clearance: Small £180-£300, Medium £300-£500, Large £500+
- Green waste removal add-on: Small +£30-£100, Medium +£50-£150, Large quote needed
- Regular garden maintenance: Small £60-£100 per visit, Medium £90-£160 per visit, Large quote needed
- Jet washing / patio cleaning: Small £80-£150, Medium £150-£280, Large quote needed
- Fence repair / small outdoor repair: quote needed, depends on panels, posts, fixings, materials, access and damage level
- Planting / seasonal refresh: Small £80-£180 excluding plants/materials, Medium £150-£300 excluding plants/materials, Large quote needed
- Extra large gardens: recommend on-site quote.

Budget-friendly guidance:
- If selected services include lawn mowing, weeding or basic tidy-up and photos do not show heavy overgrowth, provide a budget-friendly option.
- Example: "Start with lawn mowing and edge tidy from £60-£100, then quote hedge trimming or waste removal separately if needed."
- If the garden appears heavily overgrown, do not offer a misleading low budget option. Say a basic lawn cut may not be enough and a clearance visit may be needed first.
`.trim();

const GARDEN_RESULT_SCHEMA = {
  type: "json_schema",
  name: "garden_quote_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      selected_service_needs: {
        type: "array",
        items: { type: "string" }
      },
      budget_friendly_option: { type: "string" },
      recommended_add_ons: {
        type: "array",
        items: { type: "string" }
      },
      customer_reply: { type: "string" },
      visible_issues: {
        type: "array",
        items: { type: "string" }
      },
      estimated_area_sqm: { type: "string" },
      size_category: { type: "string" },
      recommended_service: { type: "string" },
      estimated_job_complexity: { type: "string" },
      starting_price_range: { type: "string" },
      follow_up_questions: {
        type: "array",
        maxItems: 3,
        items: { type: "string" }
      },
      lead_score: { type: "number" },
      internal_note_for_gardener: { type: "string" },
      suggested_gardener_reply: { type: "string" }
    },
    required: [
      "selected_service_needs",
      "budget_friendly_option",
      "recommended_add_ons",
      "customer_reply",
      "visible_issues",
      "estimated_area_sqm",
      "size_category",
      "recommended_service",
      "estimated_job_complexity",
      "starting_price_range",
      "follow_up_questions",
      "lead_score",
      "internal_note_for_gardener",
      "suggested_gardener_reply"
    ]
  }
} as const;

function buildUserPrompt(details: CustomerLeadDetails) {
  return `
Customer details:
- Name: ${details.name}
- Contact: ${details.contact}
- Postcode: ${details.postcode}
- Rough garden size: ${details.roughSize}
- Selected service needs: ${details.selectedServiceNeeds.join(", ") || "Not sure - let AI suggest"}
- Urgency: ${details.urgency}
- Green waste removal: ${details.wasteRemoval}
- Access: ${details.access}

Create a concise customer-facing recommendation, a starting price range and an internal gardener note.
Use the uploaded images as evidence, but mention uncertainty where needed. Keep the tone friendly and practical, like a London gardener giving an initial view from photos.
`.trim();
}

function extractResponseText(payload: unknown) {
  const maybe = payload as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        text?: unknown;
      }>;
    }>;
  };

  if (typeof maybe.output_text === "string" && maybe.output_text.trim()) {
    return maybe.output_text;
  }

  const text = maybe.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (!text) {
    throw new Error("OpenAI response did not include text output.");
  }

  return text;
}
