"use client";

import { createClient } from "../../lib/supabase/client";

export default function SignOutButton({ label = "Sign out" }: { label?: string }) {
    async function signOut() {
        await createClient().auth.signOut();
        window.location.href = "/login";
    }

    return (
        <button onClick={signOut} className="chip-btn">
            {label}
        </button>
    );
}