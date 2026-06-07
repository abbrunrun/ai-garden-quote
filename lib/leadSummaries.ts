import type { CustomerLeadDetails, GardenAiResult } from "./types";

export function formatEstimatedArea(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "Needs confirmation";
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed} sqm`;
  if (/^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/.test(trimmed)) return `${trimmed} sqm`;

  return trimmed;
}

export function getLeadPriority(score: number) {
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

export function buildCustomerWhatsAppSummary(
  details: CustomerLeadDetails,
  result: GardenAiResult
) {
  return `Hi, I just completed the AI Garden Check.

Name: ${details.name}
Contact: ${details.contact}
Postcode: ${details.postcode || "Not provided"}

Garden size: ${details.roughSize}
Estimated area: ${formatEstimatedArea(result.estimated_area_sqm)}
Urgency: ${details.urgency}
Access: ${details.access}
Green waste removal: ${details.wasteRemoval}

Recommended service: ${result.recommended_service}

Starting range: ${result.starting_price_range}

Could you confirm the final quote and availability?`;
}

export function buildGardenerInternalSummary(
  details: CustomerLeadDetails,
  result: GardenAiResult
) {
  return `New garden lead

Priority: ${getLeadPriority(result.lead_score)}
Lead score: ${result.lead_score}/100

Customer:
Name: ${details.name}
Contact: ${details.contact}
Postcode: ${details.postcode || "Not provided"}

Job:
Rough size: ${details.roughSize}
Estimated area: ${formatEstimatedArea(result.estimated_area_sqm)}
Size: ${result.size_category}
Urgency: ${details.urgency}
Access: ${details.access}
Green waste: ${details.wasteRemoval}
Recommended service: ${result.recommended_service}
Starting range: ${result.starting_price_range}

Visible issues:
${formatList(result.visible_issues)}

Internal note:
${result.internal_note_for_gardener}

Suggested reply:
${result.suggested_gardener_reply}`;
}

export function buildGardenerEmailBody(
  details: CustomerLeadDetails,
  result: GardenAiResult,
  customerWhatsAppSummary: string
) {
  return `New garden lead from AI Garden Quote Assistant

Priority: ${getLeadPriority(result.lead_score)}
Lead score: ${result.lead_score}/100

Customer details:
Name: ${details.name}
Contact: ${details.contact}
Postcode: ${details.postcode || "Not provided"}

Job details:
Rough garden size: ${details.roughSize}
Estimated area: ${formatEstimatedArea(result.estimated_area_sqm)}
Size category: ${result.size_category}
Urgency: ${details.urgency}
Access: ${details.access}
Green waste removal: ${details.wasteRemoval}
Recommended service: ${result.recommended_service}
Starting price range: ${result.starting_price_range}

Visible issues:
${formatList(result.visible_issues)}

AI internal note:
${result.internal_note_for_gardener}

Suggested gardener reply:
${result.suggested_gardener_reply}

Customer WhatsApp summary:
${customerWhatsAppSummary}`;
}

function formatList(items: string[]) {
  if (items.length === 0) return "- Needs confirmation";
  return items.map((item) => `- ${item}`).join("\n");
}
