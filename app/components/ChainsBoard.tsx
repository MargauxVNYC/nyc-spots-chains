"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Chain = {
    id: number;
    slug: string;
    name: string;
    emoji: string | null;
    description: string | null;
    prompt_chain_steps: { count: number }[];
    chain_runs: { count: number }[];
};

// These four power the vibe picker in NYC Spots.
const APP_SLUGS = ["online", "midwest", "jaded", "broke"];

const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function ChainsBoard() {
    const supabase = useMemo(() => createClient(), []);
    const [chains, setChains] = useState<Chain[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Create form
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("✨");
    const [description, setDescription] = useState("");
    const [busy, setBusy] = useState(false);

    // Inline edit
    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState({ name: "", emoji: "", description: "" });

    const load = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("prompt_chains")
            .select("id, slug, name, emoji, description, prompt_chain_steps(count), chain_runs(count)")
            .order("id");
        if (error) setError(error.message);
        else setChains((data ?? []) as Chain[]);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        load();
    }, [load]);

    async function create() {
        if (!name.trim()) return setError("Give the chain a name.");
        setBusy(true);
        setError("");
        const { error } = await supabase.from("prompt_chains").insert({
            name: name.trim(),
            slug: `${slugify(name)}-${Date.now().toString(36).slice(-4)}`,
            emoji: emoji.trim() || null,
            description: description.trim() || null,
        });
        setBusy(false);
        if (error) return setError(error.message);
        setName("");
        setEmoji("✨");
        setDescription("");
        setCreating(false);
        load();
    }

    function startEdit(c: Chain) {
        setEditingId(c.id);
        setDraft({ name: c.name, emoji: c.emoji ?? "", description: c.description ?? "" });
        setError("");
    }

    async function saveEdit(id: number) {
        if (!draft.name.trim()) return setError("Name can't be empty.");
        setBusy(true);
        const { data, error } = await supabase
            .from("prompt_chains")
            .update({
                name: draft.name.trim(),
                emoji: draft.emoji.trim() || null,
                description: draft.description.trim() || null,
            })
            .eq("id", id)
            .select("id");
        setBusy(false);
        if (error || !data?.length) return setError(error?.message ?? "Not permitted.");
        setEditingId(null);
        load();
    }

    async function remove(c: Chain) {
        const usedByApp = APP_SLUGS.includes(c.slug);
        const warning = usedByApp
            ? `"${c.name}" is a vibe in NYC Spots. Deleting it removes that vibe's steps and runs, and the app will fall back to a default voice. Delete anyway?`
            : `Delete "${c.name}" and all its steps and runs? This can't be undone.`;
        if (!confirm(warning)) return;

        setBusy(true);
        const { data, error } = await supabase.from("prompt_chains").delete().eq("id", c.id).select("id");
        setBusy(false);
        if (error || !data?.length) return setError(error?.message ?? "Not permitted.");
        load();
    }

    return (
        <>
            <div className="page-head">
                <div>
                    <p className="eyebrow">Prompt chains</p>
                    <h1 className="title">Your chains</h1>
                    <p className="muted" style={{ margin: 0 }}>
                        A chain is a series of AI steps. Each step&apos;s output feeds the next.
                    </p>
                </div>
                {!creating && (
                    <button className="btn btn-accent" onClick={() => setCreating(true)}>＋ New chain</button>
                )}
            </div>

            {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

            {creating && (
                <section className="panel create-chain">
                    <div className="panel-head">
                        <h2 className="panel-title">＋ New chain</h2>
                        <button className="chip-btn" onClick={() => setCreating(false)}>Cancel</button>
                    </div>
                    <div className="create-grid">
                        <label>
                            <span className="field-label">Emoji</span>
                            <input className="input emoji-input" value={emoji} maxLength={4} onChange={(e) => setEmoji(e.target.value)} />
                        </label>
                        <label>
                            <span className="field-label">Name</span>
                            <input
                                className="input"
                                placeholder="e.g. Describe → Joke → Captions"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </label>
                    </div>
                    <span className="field-label">Description</span>
                    <textarea
                        className="input edit-area"
                        rows={2}
                        placeholder="What does this chain do?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <div className="form-actions">
                        <button className="btn btn-accent" onClick={create} disabled={busy}>
                            {busy ? "Creating…" : "Create chain"}
                        </button>
                    </div>
                </section>
            )}

            {loading ? (
                <p className="soft">Loading…</p>
            ) : (
                <div className="chain-grid">
                    {chains.map((c) => {
                        const steps = c.prompt_chain_steps?.[0]?.count ?? 0;
                        const runs = c.chain_runs?.[0]?.count ?? 0;
                        const isEditing = editingId === c.id;

                        return (
                            <article key={c.id} className="panel chain-card">
                                {isEditing ? (
                                    <>
                                        <div className="create-grid">
                                            <input
                                                className="input emoji-input"
                                                value={draft.emoji}
                                                maxLength={4}
                                                onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                                            />
                                            <input
                                                className="input"
                                                value={draft.name}
                                                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                            />
                                        </div>
                                        <textarea
                                            className="input edit-area"
                                            rows={2}
                                            value={draft.description}
                                            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                                        />
                                        <div className="form-actions">
                                            <button className="btn btn-sm btn-accent" onClick={() => saveEdit(c.id)} disabled={busy}>Save</button>
                                            <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="chain-top">
                                            <span className="chain-emoji">{c.emoji ?? "⛓️"}</span>
                                            <div style={{ minWidth: 0 }}>
                                                <h2 className="chain-name">{c.name}</h2>
                                                <code className="model-code">{c.slug}</code>
                                            </div>
                                            {APP_SLUGS.includes(c.slug) && <span className="badge badge-admin">In NYC Spots</span>}
                                        </div>
                                        <p className="chain-desc">{c.description ?? <span className="soft">No description</span>}</p>
                                        <div className="chain-meta">
                                            <span>🪜 {steps} step{steps === 1 ? "" : "s"}</span>
                                            <span>▶️ {runs} run{runs === 1 ? "" : "s"}</span>
                                        </div>
                                        <div className="form-actions">
                                            <a href={`/chains/${c.id}`} className="btn btn-sm btn-accent">Open →</a>
                                            <button className="btn btn-sm" onClick={() => startEdit(c)} disabled={editingId !== null}>Edit</button>
                                            <button className="btn btn-sm btn-danger" onClick={() => remove(c)} disabled={busy}>Delete</button>
                                        </div>
                                    </>
                                )}
                            </article>
                        );
                    })}
                    {chains.length === 0 && <p className="soft">No chains yet. Create one!</p>}
                </div>
            )}
        </>
    );
}