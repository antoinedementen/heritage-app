import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { email, envId } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Invite via Supabase Auth (sends magic link / invitation email)
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        environment_id: envId ?? null,
        role: "editor",
        invitation_status: "pending",
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Upsert profile row (in case trigger didn't fire yet)
    if (data.user) {
      await admin.from("profiles").upsert({
        id: data.user.id,
        email,
        role: "editor",
        environment_id: envId ?? null,
        invitation_status: "pending",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
