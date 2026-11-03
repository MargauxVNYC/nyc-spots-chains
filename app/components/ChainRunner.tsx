"use client";

import { useRef, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type StepResult = { step_order: number; step_name: string; output: string; model: string; latency_ms: number };
type RunResult = { runId: number; status: string; steps: StepResult[]; final?: string; error?: string };

async function toJpeg(file: File, max = 1600): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process image."))), "image/jpeg", 0.85)
    );
}

export default function ChainRunner({ chainId }: { chainId: number }) {
    const supabase = createClient();
    const fileRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [inputText, setInputText] = useState("");
    const [running, setRunning] = useState(false);
    const [status, setStatus] = useState("");
    const [result, setResult] = useState<RunResult | null>(null);
    const [error, setError] = useState("");

    async function run() {
        setRunning(true);
        setError("");
        setResult(null);
        try {
            let imagePath: string | undefined;
            if (file) {
                setStatus("Uploading image…");
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) throw new Error("Please sign in.");
                imagePath = `${user.id}/chain-${Date.now()}.jpg`;
                const { error: upErr } = await supabase.storage
                    .from("uploads")
                    .upload(imagePath, await toJpeg(file), { contentType: "image/jpeg" });
                if (upErr) throw new Error(upErr.message);
            }

            setStatus("Running the chain, one step at a time…");
            const res = await fetch("/api/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chainId, imagePath, inputText }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
            setResult(data);
            if (data.status === "failed") setError(data.error ?? "A step failed.");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
        } finally {
            setRunning(false);
            setStatus("");
        }
    }

    return (
        <div className="runner">
            <section className="panel runner-input">
                <h2 className="panel-title">Input</h2>
                <label className="runner-drop">
                    {preview ? <img src={preview} alt="Input" /> : <span>🖼️ Choose an image (optional)</span>}
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            setFile(f);
                            setPreview(f ? URL.createObjectURL(f) : null);
                        }}
                    />
                </label>
                {file && (
                    <button
                        className="chip-btn"
                        onClick={() => {
                            setFile(null);
                            setPreview(null);
                            if (fileRef.current) fileRef.current.value = "";
                        }}
                    >
                        Remove image
                    </button>
                )}
                <span className="field-label">Text input (optional)</span>
                <textarea
                    className="input edit-area"
                    rows={3}
                    placeholder="e.g. my first time at the Met, 2 hours before closing"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <button className="btn btn-accent btn-lg" onClick={run} disabled={running || (!file && !inputText.trim())}>
                    {running ? "Running…" : "▶️ Run chain"}
                </button>
                {status && <p className="soft small" style={{ marginTop: 10 }}>{status}</p>}
                {error && <p className="error-text">{error}</p>}
            </section>

            <section className="runner-output">
                {!result && !running && (
                    <div className="panel soft">Run the chain to see each step&apos;s output here.</div>
                )}
                {running && (
                    <div className="panel">
                        <span className="skeleton-line" style={{ width: "70%" }} />
                        <span className="skeleton-line" style={{ width: "50%", marginTop: 10 }} />
                    </div>
                )}
                {result?.steps.map((s) => (
                    <article key={s.step_order} className="panel result-step">
                        <div className="result-head">
                            <span className="step-num step-num-sm">{s.step_order}</span>
                            <strong>{s.step_name}</strong>
                            <code className="model-code">{s.model}</code>
                            <span className="soft small" style={{ margin: 0 }}>{(s.latency_ms / 1000).toFixed(1)}s</span>
                        </div>
                        <p className="result-text">{s.output}</p>
                    </article>
                ))}
                {result?.final && (
                    <article className="panel final-output">
                        <p className="eyebrow">✨ Final output</p>
                        <p className="result-text">{result.final}</p>
                    </article>
                )}
            </section>
        </div>
    );
}