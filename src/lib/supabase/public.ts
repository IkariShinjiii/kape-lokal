import { createClient } from "@supabase/supabase-js";

// Anonymous client for public reads and visitor-submitted reports. No cookies, so
// it is safe to use inside cached functions.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export { mediaUrl } from "@/lib/media";
