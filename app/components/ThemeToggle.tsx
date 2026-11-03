"use client";

import { useEffect, useState } from "react";

type Pref = "light" | "dark" | "system";

function apply(pref: Pref) {
    const dark =
        pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export default function ThemeToggle() {
    const [pref, setPref] = useState<Pref>("system");

    useEffect(() => {
        let saved: Pref = "system";
        try {
            saved = (localStorage.getItem("theme") as Pref) || "system";
        } catch {}
        setPref(saved);
    }, []);

    // While on "System", follow the operating system if it changes.
    useEffect(() => {
        apply(pref);
        if (pref !== "system") return;
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => apply("system");
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, [pref]);

    function choose(next: Pref) {
        setPref(next);
        try {
            localStorage.setItem("theme", next);
        } catch {}
    }

    const options: { value: Pref; icon: string; label: string }[] = [
        { value: "light", icon: "☀️", label: "Light" },
        { value: "dark", icon: "🌙", label: "Dark" },
        { value: "system", icon: "💻", label: "System" },
    ];

    return (
        <div className="theme-toggle" role="radiogroup" aria-label="Color theme">
            {options.map((o) => (
                <button
                    key={o.value}
                    role="radio"
                    aria-checked={pref === o.value}
                    className={`theme-opt${pref === o.value ? " active" : ""}`}
                    onClick={() => choose(o.value)}
                    title={o.label}
                >
                    <span aria-hidden="true">{o.icon}</span>
                    <span className="theme-label">{o.label}</span>
                </button>
            ))}
        </div>
    );
}