import type { Metadata } from "next";
import { requireAdmin } from "../lib/admin";
import ChainsBoard from "./components/ChainsBoard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prompt chains · NYC Spots" };

export default async function Home() {
    await requireAdmin();
    return <ChainsBoard />;
}