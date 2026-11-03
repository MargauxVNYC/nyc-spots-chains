"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Step = { id: number; step_order: number; name: string; instructions: string; uses_image: boolean };
type Draft = { name: string; instructions: string; uses_image: boolean };

const EMPTY: Draft = { name: "", instructions: "", uses_image: false };

// The example chain from the assignment
const EXAMPLE: Draft[] = [
    {
        name: "Describe the image",
        uses_image: true,
        instructions:
            "Describe this image in 2–3 sentences. Include specific details: objects, colors, the setting, " +
            "what people are doing (never identify anyone), and anything unusual or out of place.",
    },
    {
        name: "Find the funny angle",
        uses_image: false,
        instructions:
            "Using the description, write 3 short observations about what is funny, ironic, or relatable " +
            "about this scene for a college student new to New York City.",
    },
    {
        name: "Write captions",
        uses_image: false,
        instructions:
            "Using those observations, write five short, funny captions for the photo, each under 15 words. " +
            "Number them 1–5. No hashtags. Playful, never mean.",
    },
];

export default function StepsEditor({ chainId, usedByApp }: { chainId: number; usedByApp: boolean }) {
    const supabase = useMemo(() => createClient(), []);
    const [steps, setSteps] = useState<Step[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState<Draft>(EMPTY);
    const [adding, setAdding] = useState(false);
    const [newStep, setNewStep] = useState<Draft>(EMPTY);

    const load = useCallback(async () => {
        const { data, error } = await supabase
            .from("prompt_chain_steps")
            .select("id, step_order, name, instructions, uses_image")
            .eq("chain_id", chainId)
            .order("step_order");
        if (error) setError(error.message);
        else setSteps((data ?? []) as Step[]);
        setLoading(false);
    }, [supabase, chainId]);

    useEffect(() => {
        load();
    }, [load]);

    // Save a new order for all steps in one database call.
    async function saveOrder(ordered: Step[]) {
        const { error } = await supabase.rpc("reorder_chain_steps", {
            p_chain_id: chainId,
            p_step_ids: ordered.map((s) => s.id),
        });
        if (error) setError(error.message);
    }

    async function move(index: number, dir: -1 | 1) {
        const target = index + dir;
        if (target < 0 || target >= steps.length) return;
        const next = [...steps];
        [next[index], next[target]] = [next[target], next[index]];
        setSteps(next.map((s, i) => ({ ...s, step_order: i + 1 }))); // update the screen right away
        setBusy(true);
        setError("");
        await saveOrder(next);
        setBusy(false);
        load();
    }

    async function addSteps(drafts: Draft[]) {
        const clean = drafts.filter((d) => d.name.trim() && d.instructions.trim());
        if (clean.length === 0) return setError("Each step needs a name and instructions.");
        setBusy(true);
        setError("");
        const start = steps.reduce((max, s) => Math.max(max, s.step_order), 0);
        const { error } = await supabase.from("prompt_chain_steps").insert(
            clean.map((d, i) => ({
                chain_id: chainId,
                step_order: start + i + 1,
                name: d.name.trim(),
                instructions: d.instructions.trim(),
                uses_image: d.uses_image,
            }))
        );
        setBusy(false);
        if (error) return setError(error.message);
        setNewStep(EMPTY);
        setAdding(false);
        load();
    }

    async function saveEdit(id: number) {
        if (!draft.name.trim() || !draft.instructions.trim()) return setError("Name and instructions can't be empty.");
        setBusy(true);
        setError("");
        const { data, error } = await supabase
            .from("prompt_chain_steps")
            .update({ name: draft.name.trim(), instructions: draft.instructions.trim(), uses_image: draft.uses_image })
            .eq("id", id)
            .select("id");
        setBusy(false);
        if (error || !data?.length) return setError(error?.message ?? "Not permitted.");
        setEditingId(null);
        load();
    }

    async function remove(step: Step) {
        if (!confirm(`Delete step ${step.step_order}, "${step.name}"?`)) return;
        setBusy(true);
        setError("");
        const { data, error } = await supabase.from("prompt_chain_steps").delete().eq("id", step.id).select("id");
        if (error || !data?.length) {
            setBusy(false);
            return setError(error?.message ?? "Not permitted.");
        }
        // Close the gap so steps stay numbered 1, 2, 3…
        const remaining = steps.filter((s) => s.id !== step.id);
        if (remaining.length) await saveOrder(remaining);
        setBusy(false);
        load();
    }

    const stepForm = (value: Draft, set: (d: Draft) => void) => (
        <>
            <input
                className="input"
                placeholder="Step name, e.g. Describe the image"
                value={value.name}
                onChange={(e) => set({ ...value, name: e.target.value })}
            />
            <textarea
                className="input edit-area"
                rows={4}
                placeholder="What should the AI do in this step? It receives the previous step's output."
                value={value.instructions}
                onChange={(e) => set({ ...value, instructions: e.target.value })}
            />
            <label className="check-label">
                <input
                    type="checkbox"
                    checked={value.uses_image}
                    onChange={(e) => set({ ...value, uses_image: e.target.checked })}
                />
                This step looks at the uploaded image
            </label>
        </>
    );

    if (loading) return <p className="soft">Loading steps…</p>;

    return (
        <div className="steps-wrap">
            {usedByApp && (
                <p className="info-note">
                    ℹ️ This chain is a vibe in NYC Spots. Its steps are combined into the caption prompt there, so edits
                    here change how the app writes captions.
                </p>
            )}
            {error && <p className="error-text">{error}</p>}

            {steps.length === 0 && !adding && (
                <div className="panel empty-steps">
                    <p style={{ margin: "0 0 12px" }}>This chain has no steps yet.</p>
                    <div className="form-actions">
                        <button className="btn btn-accent" onClick={() => addSteps(EXAMPLE)} disabled={busy}>
                            ✨ Add the example 3-step chain
                        </button>
                        <button className="btn" onClick={() => setAdding(true)}>＋ Add a step</button>
                    </div>
                </div>
            )}

            <ol className="step-list">
                {steps.map((step, i) => (
                    <li key={step.id}>
                        <article className={`panel step-card${editingId === step.id ? " is-editing" : ""}`}>
                            <div className="step-num">{i + 1}</div>
                            <div className="step-body">
                                {editingId === step.id ? (
                                    <>
                                        {stepForm(draft, setDraft)}
                                        <div className="form-actions">
                                            <button className="btn btn-sm btn-accent" onClick={() => saveEdit(step.id)} disabled={busy}>Save</button>
                                            <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="step-title-row">
                                            <h3 className="step-name">{step.name}</h3>
                                            {step.uses_image && <span className="badge badge-admin">🖼️ Sees the image</span>}
                                        </div>
                                        <p className="step-instructions">{step.instructions}</p>
                                    </>
                                )}
                            </div>
                            {editingId !== step.id && (
                                <div className="step-actions">
                                    <button className="icon-btn" onClick={() => move(i, -1)} disabled={busy || i === 0} title="Move up" aria-label="Move up">↑</button>
                                    <button className="icon-btn" onClick={() => move(i, 1)} disabled={busy || i === steps.length - 1} title="Move down" aria-label="Move down">↓</button>
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => {
                                            setEditingId(step.id);
                                            setDraft({ name: step.name, instructions: step.instructions, uses_image: step.uses_image });
                                        }}
                                        disabled={editingId !== null}
                                    >
                                        Edit
                                    </button>
                                    <button className="btn btn-sm btn-danger" onClick={() => remove(step)} disabled={busy}>Delete</button>
                                </div>
                            )}
                        </article>
                        {i < steps.length - 1 && <div className="step-connector">↓ output feeds step {i + 2}</div>}
                    </li>
                ))}
            </ol>

            {adding ? (
                <section className="panel step-card is-editing">
                    <div className="step-num">{steps.length + 1}</div>
                    <div className="step-body">
                        {stepForm(newStep, setNewStep)}
                        <div className="form-actions">
                            <button className="btn btn-sm btn-accent" onClick={() => addSteps([newStep])} disabled={busy}>Add step</button>
                            <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
                        </div>
                    </div>
                </section>
            ) : (
                steps.length > 0 && (
                    <button className="btn add-step-btn" onClick={() => setAdding(true)}>＋ Add step {steps.length + 1}</button>
                )
            )}
        </div>
    );
}