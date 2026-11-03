import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

// Every admin page calls this first. Non-admins never get past it.
export async function requireAdmin() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_superadmin, first_name, avatar_url")
        .eq("id", user.id)
        .single();

    if (!profile?.is_superadmin) redirect("/denied");

    return { supabase, user, profile };
}