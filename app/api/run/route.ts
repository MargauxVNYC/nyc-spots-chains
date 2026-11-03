import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export const maxDuration = 60;

const FALLBACK_MODELS = [
    process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
];

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

// Retries briefly if Google is overloaded, then falls back to the next model.
async function callGemini(models: string[], parts: Part[]) {
    for (const model of [...new Set(models)]) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
                    body: JSON.stringify({
                        contents: [{ role: "user", parts }],
                        generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
                    }),
                }
            );
            if (res.ok) {
                const data = await res.json();
                const text = (data.candidates?.[0]?.content?.parts ?? [])
                    .map((p: { text?: string }) => p.text ?? "")
                    .join("")
                    .trim();
                if (text) return { text, model };
                break; // empty answer: try the next model
            }
            console.error(`Gemini error (${model}, attempt ${attempt})`, res.status, await res.text());
            if (res.status === 404) break;
            if (![429, 500, 503].includes(res.status)) break;
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
        }
    }
    throw new Error("The AI is busy or unavailable right now. Try again in a minute.");
}

async function loadImage(url: string) {
    try {
        const res = await fetch(url, { headers: { "User-Agent": "NYCSpots/1.0 (class project)" } });
        const type = res.headers.get("content-type") ?? "";
        if (!res.ok || !type.startsWith("image/")) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 8 * 1024 * 1024) return null;
        return { mimeType: type.split(";")[0], data: buf.toString("base64") };
    } catch {
        return null;
    }
}

export async function POST(request: Request) {
    const supabase = await createClient();

    // Superadmins only
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("is_superadmin").eq("id", user.id).single();
    if (!profile?.is_superadmin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

    const body = await request.json().catch(() => null);
    const chainId = Number(body?.chainId);
    const imagePath = typeof body?.imagePath === "string" ? body.imagePath : null;
    const inputText = typeof body?.inputText === "string" ? body.inputText.trim().slice(0, 2000) : "";

    if (!chainId) return NextResponse.json({ error: "Missing chain." }, { status: 400 });
    if (imagePath && !imagePath.startsWith(`${user.id}/`)) {
        return NextResponse.json({ error: "That image isn't yours." }, { status: 403 });
    }

    const [{ data: chain }, { data: stepRows }, { data: modelRows }] = await Promise.all([
        supabase.from("prompt_chains").select("id, name").eq("id", chainId).maybeSingle(),
        supabase
            .from("prompt_chain_steps")
            .select("step_order, name, instructions, uses_image")
            .eq("chain_id", chainId)
            .order("step_order"),
        supabase.from("llm_models").select("api_model_id").eq("is_active", true).order("priority"),
    ]);

    if (!chain) return NextResponse.json({ error: "Chain not found." }, { status: 404 });
    const steps = stepRows ?? [];
    if (steps.length === 0) return NextResponse.json({ error: "Add at least one step first." }, { status: 400 });
    const models = modelRows?.length ? modelRows.map((m) => m.api_model_id) : FALLBACK_MODELS;

    let imageUrl: string | null = null;
    let image: { mimeType: string; data: string } | null = null;
    if (imagePath) {
        imageUrl = supabase.storage.from("uploads").getPublicUrl(imagePath).data.publicUrl;
        image = await loadImage(imageUrl);
        if (!image) return NextResponse.json({ error: "Couldn't read that image." }, { status: 400 });
    }
    if (!image && !inputText) {
        return NextResponse.json({ error: "Add an image, some input text, or both." }, { status: 400 });
    }

    // Record the run
    const { data: run, error: runError } = await supabase
        .from("chain_runs")
        .insert({ chain_id: chainId, image_url: imageUrl, input_text: inputText || null, status: "running" })
        .select("id")
        .single();
    if (runError || !run) {
        return NextResponse.json({ error: runError?.message ?? "Couldn't start the run." }, { status: 500 });
    }

    // If no step is marked "uses image", give the image to step 1.
    const anyImageStep = steps.some((s) => s.uses_image);
    const results: { step_order: number; step_name: string; output: string; model: string; latency_ms: number }[] = [];
    let previous = "";

    for (const [i, step] of steps.entries()) {
        const attachImage = !!image && (step.uses_image || (!anyImageStep && i === 0));

        const prompt = [
            `You are step ${i + 1} of ${steps.length} in a prompt chain called "${chain.name}".`,
            "",
            "Instructions for this step:",
            step.instructions,
            "",
            i === 0
                ? inputText
                    ? `Input:\n${inputText}`
                    : "Input: the attached image."
                : `Output from the previous step:\n${previous}`,
            i > 0 && inputText ? `\nThe user's original input, for context:\n${inputText}` : "",
            attachImage && i > 0 ? "The original image is attached for reference." : "",
            "",
            "Respond with only this step's output, with no preamble.",
        ]
            .filter((line) => line !== "")
            .join("\n");

        const parts: Part[] = attachImage ? [{ inlineData: image! }, { text: prompt }] : [{ text: prompt }];

        try {
            const started = Date.now();
            const { text, model } = await callGemini(models, parts);
            const latency = Date.now() - started;

            await supabase.from("chain_run_steps").insert({
                run_id: run.id,
                step_order: i + 1,
                step_name: step.name,
                prompt,
                output: text,
                model,
                latency_ms: latency,
            });
            results.push({ step_order: i + 1, step_name: step.name, output: text, model, latency_ms: latency });
            previous = text;
        } catch (e) {
            const message = e instanceof Error ? e.message : "Step failed.";
            await supabase
                .from("chain_runs")
                .update({ status: "failed", error: `Step ${i + 1} (${step.name}): ${message}` })
                .eq("id", run.id);
            return NextResponse.json({ runId: run.id, status: "failed", steps: results, error: message });
        }
    }

    await supabase.from("chain_runs").update({ status: "succeeded", final_output: previous }).eq("id", run.id);
    return NextResponse.json({ runId: run.id, status: "succeeded", steps: results, final: previous });
}