import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

export const GARDEN_UPLOAD_BUCKET = "garden-uploads";

export function createSupabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}
