export type Urgency = "ASAP" | "This week" | "This month" | "Just checking";
export type WasteRemoval = "Yes" | "No" | "Not sure";
export type AccessType = "Rear access" | "Through house" | "Not sure";
export type LeadStatus = "New" | "Need info" | "Quoted" | "Booked" | "Completed";

export type CustomerLeadDetails = {
  name: string;
  contact: string;
  postcode: string;
  roughSize: string;
  urgency: Urgency;
  wasteRemoval: WasteRemoval;
  access: AccessType;
};

export type GardenAiResult = {
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
