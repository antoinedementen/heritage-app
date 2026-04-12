import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import LandingPage from "./LandingPage";

export default async function Home() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // User is logged in — find their environment and redirect
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

  // Not logged in → show landing page
  return <LandingPage />;
}
