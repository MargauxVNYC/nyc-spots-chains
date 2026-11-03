import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../lib/admin";
import StepsEditor from "../../components/StepsEditor";
import ChainRunner from "../../components/ChainRunner";
import ChainHistory from "../../components/ChainHistory";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Chain · Prompt Chains" };

const APP_SLUGS = ["online", "midwest", "jaded", "broke"];

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
};

export default async function ChainPage({ params, searchParams }: Props) {
    const { id } = await params;
    const { tab = "steps" } = await searchParams;
    const { supabase } = await requireAdmin();

    const { data: chain } = await supabase
        .from("prompt_chains")
        .select("id, slug, name, emoji, description")
        .eq("id", Number(id))
        .maybeSingle();
    if (!chain) notFound();

    const tabs = [
        { key: "steps", label: "🪜 Steps" },
        { key: "run", label: "▶️ Run" },
        { key: "history", label: "🖼️ Generated media" },
    ];

    return (
        <>
            <a href="/" className="back-link">← All chains</a>

            <div className="chain-header">
                <span className="chain-emoji chain-emoji-lg">{chain.emoji ?? "⛓️"}</span>
                <div>
                    <h1 className="title" style={{ margin: 0 }}>{chain.name}</h1>
                    <p className="muted" style={{ margin: "2px 0 0" }}>
                        {chain.description ?? "No description"} · <code className="model-code">{chain.slug}</code>
                    </p>
                </div>
            </div>

            <nav className="tabs-bar">
                {tabs.map((t) => (
                    <a
                        key={t.key}
                        href={`/chains/${chain.id}?tab=${t.key}`}
                        className={`tabs-link${tab === t.key ? " active" : ""}`}
                    >
                        {t.label}
                    </a>
                ))}
            </nav>

            {tab === "steps" && <StepsEditor chainId={chain.id} usedByApp={APP_SLUGS.includes(chain.slug)} />}
            {tab === "run" && <ChainRunner chainId={chain.id} />}
            {tab === "history" && <ChainHistory chainId={chain.id} />}
        </>
    );
}