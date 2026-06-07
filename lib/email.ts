import { Resend } from "resend";
import {
  buildCustomerWhatsAppSummary,
  formatEstimatedArea,
  getLeadPriority
} from "./leadSummaries";
import type { CustomerLeadDetails, GardenAiResult } from "./types";

export async function sendGardenerLeadEmail(
  details: CustomerLeadDetails,
  result: GardenAiResult
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.GARDENER_EMAIL;
  const from = process.env.EMAIL_FROM;

  if (!isConfiguredGardenerEmail(to)) {
    console.warn("Gardener email is not configured correctly.");
    return false;
  }

  if (!apiKey || !to || !from) {
    console.warn("Gardener email not sent: RESEND_API_KEY, GARDENER_EMAIL or EMAIL_FROM missing.");
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const customerWhatsAppSummary = buildCustomerWhatsAppSummary(details, result);
    const subject = buildSubject(details, result);

    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      text: buildEmailText(details, result, customerWhatsAppSummary),
      replyTo: details.contact.includes("@") ? details.contact : undefined,
      tags: [
        {
          name: "priority",
          value: getLeadPriority(result.lead_score).toLowerCase()
        }
      ]
    });

    if (error) {
      console.error("Gardener email failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Gardener email failed:", error);
    return false;
  }
}

function buildSubject(details: CustomerLeadDetails, result: GardenAiResult) {
  const postcode = details.postcode.trim();

  if (postcode) {
    return `New Garden Lead - ${postcode} - ${result.recommended_service} - ${result.starting_price_range}`;
  }

  return `New Garden Lead - ${result.recommended_service} - ${result.starting_price_range}`;
}

function isConfiguredGardenerEmail(value: string | undefined) {
  if (!value) return false;

  const trimmed = value.trim();

  if (!trimmed || trimmed.includes("\u4f60\u7684Resend\u6ce8\u518c\u90ae\u7bb1")) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function buildEmailText(
  details: CustomerLeadDetails,
  result: GardenAiResult,
  customerWhatsAppSummary: string
) {
  return [
    "New garden lead from AI Garden Quote Assistant",
    "",
    `Priority: ${getLeadPriority(result.lead_score)}`,
    `Lead score: ${result.lead_score}/100`,
    "",
    "Customer details:",
    `Name: ${details.name}`,
    `Contact: ${details.contact}`,
    `Postcode: ${details.postcode || "Not provided"}`,
    "",
    "Job details:",
    `Rough garden size: ${details.roughSize}`,
    `Estimated area: ${formatEstimatedArea(result.estimated_area_sqm)}`,
    `Size category: ${result.size_category}`,
    `Urgency: ${details.urgency}`,
    `Access: ${details.access}`,
    `Green waste removal: ${details.wasteRemoval}`,
    `Selected services: ${formatSelectedServices(details, result)}`,
    `Recommended service: ${result.recommended_service}`,
    `Starting price range: ${result.starting_price_range}`,
    `Budget-friendly option: ${result.budget_friendly_option || "Not provided"}`,
    `Recommended add-ons: ${formatInlineList(result.recommended_add_ons)}`,
    "",
    "Visible issues:",
    formatList(result.visible_issues),
    "",
    "Follow-up questions:",
    formatList(result.follow_up_questions),
    "",
    "AI internal note:",
    result.internal_note_for_gardener || "Not available",
    "",
    "Suggested gardener reply:",
    result.suggested_gardener_reply || "Not available",
    "",
    "Customer WhatsApp summary:",
    customerWhatsAppSummary
  ].join("\n");
}

function formatList(items: string[]) {
  if (items.length === 0) return "- Needs confirmation";
  return items.map((item) => `- ${item}`).join("\n");
}

function formatInlineList(items: string[]) {
  return items.length > 0 ? items.join(", ") : "Not provided";
}

function formatSelectedServices(details: CustomerLeadDetails, result: GardenAiResult) {
  const services =
    result.selected_service_needs.length > 0
      ? result.selected_service_needs
      : details.selectedServiceNeeds;

  return services.join(", ");
}
