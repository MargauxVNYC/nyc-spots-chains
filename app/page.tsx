import { requireAdmin } from "../lib/admin";

import type { Metadata } from "next";
export const metadata: Metadata = { title: "Overview · NYC Spots Admin" };

export const dynamic = "force-dynamic";

export default async function Overview() {
  const { profile } = await requireAdmin();

  return (
      <>
        <p className="eyebrow">Overview</p>
        <h1 className="title">Welcome, {profile.first_name ?? "admin"}</h1>
        <p className="muted">You&apos;re in. Stats are coming next.</p>
      </>
  );
}