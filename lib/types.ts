export type Urgency = "ASAP" | "This week" | "This month" | "Just checking";
export type WasteRemoval = "Yes" | "No" | "Not sure";
export type AccessType = "Rear access" | "Through house" | "Not sure";
export type LeadStatus = "New" | "Need info" | "Quoted" | "Booked" | "Completed";

export type ServiceNeed =
  | "Lawn mowing / grass cutting"
  | "Hedge trimming"
  | "Weeding / border tidy"
  | "General garden tidy-up"
  | "Overgrown garden clearance"
  | "Green waste removal"
  | "Regular garden maintenance"
  | "Jet washing / patio cleaning"
  | "Fence repair / small outdoor repair"
  | "Planting / seasonal refresh"
  | "Not sure - let AI suggest";

export type CustomerLeadDetails = {
  name: string;
  contact: string;
  postcode: string;
  roughSize: string;
  urgency: Urgency;
  wasteRemoval: WasteRemoval;
  access: AccessType;
  selectedServiceNeeds: ServiceNeed[];
};

export type GardenAiResult = {
  selected_service_needs: string[];
  budget_friendly_option: string;
  recommended_add_ons: string[];
  customer_reply: string;
  visible_issues: string[];
  estimated_area_sqm: string;
  size_category: string;
  recommended_service: string;
  estimated_job_complexity: string;
  starting_price_range: string;
  follow_up_questions: string[];
  lead_score: number;
  internal_note_for_gardener: string;
  suggested_gardener_reply: string;
};

export type LeadInsert = {
  name: string;
  contact: string;
  postcode: string;
  rough_size: string;
  urgency: Urgency;
  waste_removal: WasteRemoval;
  access: AccessType;
  status: LeadStatus;
  image_paths: string[];
  ai_result: GardenAiResult;
  customer_reply: string;
  visible_issues: string[];
  estimated_area_sqm: string;
  size_category: string;
  recommended_service: string;
  estimated_job_complexity: string;
  starting_price_range: string;
  follow_up_questions: string[];
  lead_score: number;
  internal_note_for_gardener: string;
  suggested_gardener_reply: string;
};

export type LeadRecord = LeadInsert & {
  id: string;
  created_at: string;
};
