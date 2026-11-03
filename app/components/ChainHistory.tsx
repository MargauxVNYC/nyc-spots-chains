import { createClient } from "../../lib/supabase/server";

const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

type RunStep = { step_order: number; step_name: string; output: string | null; model: string | null };

export default async function ChainHistory({ chainId }: { chainId: number }) {
    const supabase = await createClient();

    const [{ data: runs }, { data: requests }] = await Promise.all([
        supabase
            .from("chain_runs")
            .select("id, image_url, input_text, final_output, status, error, created_at, chain_run_steps(step_order, step_name, output, model)")
            .eq("chain_id", chainId)
            .order("created_at", { ascending: false })
            .limit(30),
        supabase
            .from("generation_requests")
            .select("batch_id")
            .eq("chain_id", chainId)
            .eq("status", "succeeded")
            .not("batch_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(40),
    ]);

    // Captions NYC Spots generated with this chain, grouped into posts
    const batchIds = (requests ?? []).map((r) => r.batch_id as string);
    let posts: { batchId: string; image: string | null; label: string; captions: string[]; date: string }[] = [];
    if (batchIds.length) {
        const { data: gens } = await supabase
            .from("generations")
            .select("caption, batch_id, image_url, created_at, nyc_spots(name, image_url)")
            .in("batch_id", batchIds)
            .order("created_at", { ascending: false });

        const map = new Map<string, (typeof posts)[number]>();
        for (const g of gens ?? []) {
            const spot = (Array.isArray(g.nyc_spots) ? g.nyc_spots[0] : g.nyc_spots) as
                | { name: string; image_url: string | null }
                | null;
            let post = map.get(g.batch_id);
            if (!post) {
                post = {
                    batchId: g.batch_id,
                    image: g.image_url ?? spot?.image_url ?? null,
                    label: g.image_url ? "📸 User photo" : `📍 ${spot?.name ?? "Spot"}`,
                    captions: [],
                    date: fmt.format(new Date(g.created_at)),
                };
                map.set(g.batch_id, post);
            }
            post.captions.push(g.caption);
        }
        posts = [...map.values()];
    }

    return (
        <div className="history">
            <h2 className="section-title">▶️ Runs from this tool <span className="soft">({runs?.length ?? 0})</span></h2>
            {(runs ?? []).length === 0 && <p className="soft">No runs yet. Try the Run tab.</p>}
            <div className="history-grid">
                {(runs ?? []).map((r) => {
                    const steps = [...((r.chain_run_steps ?? []) as RunStep[])].sort((a, b) => a.step_order - b.step_order);
                    return (
                        <article key={r.id} className="panel history-card">
                            {r.image_url && <img src={r.image_url} alt="" className="history-img" />}
                            <div className="history-body">
                                <div className="result-head">
                  <span className={`badge ${r.status === "succeeded" ? "badge-up" : r.status === "failed" ? "badge-down" : ""}`}>
                    {r.status}
                  </span>
                                    <span className="soft small" style={{ margin: 0 }}>{fmt.format(new Date(r.created_at))}</span>
                                </div>
                                {r.input_text && <p className="soft small">Input: &ldquo;{r.input_text}&rdquo;</p>}
                                {r.final_output && <p className="result-text">{r.final_output}</p>}
                                {r.error && <p className="error-text">{r.error}</p>}
                                {steps.length > 0 && (
                                    <details className="prompt">
                                        <summary>Show all {steps.length} steps</summary>
                                        {steps.map((s) => (
                                            <div key={s.step_order} className="history-step">
                                                <strong>{s.step_order}. {s.step_name}</strong>
                                                <pre>{s.output}</pre>
                                            </div>
                                        ))}
                                    </details>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>

            <h2 className="section-title" style={{ marginTop: 28 }}>
                💬 Captions made with this chain in NYC Spots <span className="soft">({posts.length} posts)</span>
            </h2>
            {posts.length === 0 && <p className="soft">None yet. NYC Spots logs which chain wrote each post.</p>}
            <div className="history-grid">
                {posts.map((p) => (
                    <article key={p.batchId} className="panel history-card">
                        {p.image && <img src={p.image} alt="" className="history-img" />}
                        <div className="history-body">
                            <p className="soft small">{p.label} · {p.date}</p>
                            <ul className="history-captions">
                                {p.captions.map((c, i) => (
                                    <li key={i}>{c}</li>
                                ))}
                            </ul>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}