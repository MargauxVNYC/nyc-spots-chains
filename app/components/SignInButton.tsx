"use client";

import { createClient } from "../../lib/supabase/client";

export default function SignInButton() {
    async function signIn() {
        await createClient().auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
    }

    return (
        <button onClick={signIn} className="btn btn-accent btn-lg">
            Sign in with Google
        </button>
    );
}