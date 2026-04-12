import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import LandingPage from "./LandingPage";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, environment_id, invitation_status")
        .eq("id", user.id)
        .single();

      if (profile?.role === "super_admin") {
        redirect("/admin");
      } else if (profile?.environment_id &&
        (profile?.invitation_status === "approved" || profile?.role === "guest")) {
        redirect(`/${profile.environment_id}`);
      } else {
        redirect("/pending");
      }
    }
  } catch {
    // Supabase unavailable at build time — show landing page
  }

  return <LandingPage />;
}
