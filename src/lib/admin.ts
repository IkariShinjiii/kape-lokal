import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

// Admin pages live under /en/admin. Admin screens are English only.
export const ADMIN_HOME = "/en/admin";
export const ADMIN_LOGIN = "/en/admin/login";

export async function getAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  // RLS lets a signed-in user read only their own profile row.
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  return { supabase, user, isAdmin: data?.role === "admin" };
}

// For pages: send signed-out visitors to sign in.
export async function requireSignedIn() {
  const admin = await getAdmin();
  if (!admin.user) redirect(ADMIN_LOGIN);
  return admin as typeof admin & { user: NonNullable<typeof admin.user> };
}

// For server actions: stop anyone who is not an admin.
export async function assertAdmin() {
  const admin = await getAdmin();
  if (!admin.isAdmin) throw new Error("Not allowed");
  return admin;
}
