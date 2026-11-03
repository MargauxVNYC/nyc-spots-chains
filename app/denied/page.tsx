import { createClient } from "../../lib/supabase/server";
import SignOutButton from "../components/SignOutButton";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Access denied · NYC Spots Admin" };

export default async function DeniedPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <main className="center-screen">
            <div className="panel center-card">
                <div className="lock">⛔</div>
                <h1 className="title" style={{ fontSize: 28 }}>Access denied</h1>
                <p className="muted" style={{ margin: "0 0 8px" }}>
                    <strong>{user?.email}</strong> doesn&apos;t have admin access.
                </p>
                <p className="soft" style={{ margin: "0 0 24px", fontSize: 14 }}>
                    Ask a project owner to grant you superadmin rights.
                </p>
                <SignOutButton label="Sign out and switch accounts" />
            </div>
        </main>
    );
}