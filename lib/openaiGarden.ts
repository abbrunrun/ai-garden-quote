import { requireEnv } from "./env";
import { emptyAiResult, normalizeAiResult } from "./gardenRules";
import type { AccessType, GardenAiResult, Urgency, WasteRemoval } from "./types";

type ImageInput = {
  dataUrl: string;
  mimeType: string;
};

type CustomerDetails = {
  name: string;
  contact: string;
  postcode: string;
  roughSize: string;
  urgency: Urgency;
  wasteRemoval: WasteRemoval;
  access: AccessType;
};

export async function analyzeGardenLead(
  details: CustomerDetails,
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
      internal_note_for_gardener:
        "AI analysis failed or returned invalid JSON. Use photos and form details to manually qualify this lead."
    });
  }
}

const SYSTEM_PROMPT = `
You are helping a local London gardener reply to a customer. Analyse the garden photos and form details.
Return only valid JSON with these exact keys:
{
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
- Write like a practical local gardener: simple, friendly, plain English, not glossy, not robotic.
- This is a non-binding starting range, never a fixed final quote.
- Final quote depends on garden size, access, green waste volume and exact work required.
- Keep the customer wording modest. Do not overclaim from photos.
- Do not overclaim. If something is not clearly visible, say it needs confirmation.
- Ask no more than 3 follow-up questions.
- Convert dimensions such as "8m x 5m" into square metres.
- Size categories: Small 0-30 sqm, Medium 31-70 sqm, Large 71-150 sqm, Extra large 150+ sqm.
- If the area is unknown, give a wider range and ask a size follow-up.
- If heavily overgrown, increase complexity by one level.
- If green waste removal is needed, mention it may increase price.
- If green waste removal = Yes, do not assume it is included in regular maintenance.
- If green waste removal = Yes, ask whether the waste is only normal grass clippings or larger waste such as branches, hedge cuttings, bags of debris, or overgrown plant material.
- If the garden looks in good condition but green waste removal = Yes, still mention that waste volume may change the final quote.
- If there is no rear access, mention final quote needs confirmation.
- The customer_reply should be short and natural, around 2-4 sentences.
- Include practical reasons for the range in visible_issues and internal_note_for_gardener.

Service packages:
- Basic Lawn & Edge Tidy
- Garden Rescue Visit
- Heavy Overgrown Clearance
- Regular Garden Maintenance
- Pre-Sale / Rental Garden Makeover
- Green Waste Removal

Pricing:
- Basic Lawn & Edge Tidy: Small £60-£100, Medium £90-£150, Large £150-£250
- Garden Rescue Visit: Small £120-£180, Medium £180-£280, Large £280-£450
- Heavy Overgrown Clearance: Small £180-£300, Medium £300-£500, Large £500+
- Regular Garden Maintenance: Small £60-£100 per visit, Medium £90-£160 per visit, Large quote needed
`.trim();

const GARDEN_RESULT_SCHEMA = {
  type: "json_schema",
  name: "garden_quote_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
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

function buildUserPrompt(details: CustomerDetails) {
  return `
Customer details:
- Name: ${details.name}
- Contact: ${details.contact}
- Postcode: ${details.postcode}
- Rough garden size: ${details.roughSize}
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
