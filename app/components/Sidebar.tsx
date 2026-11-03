"use client";

import { usePathname } from "next/navigation";

const groups = [
    {
        label: "",
        links: [
            { href: "/", label: "Overview", icon: "📊" },
            { href: "/users", label: "Users", icon: "👥" },
        ],
    },
    {
        label: "Content",
        links: [
            { href: "/captions", label: "AI captions", icon: "💬" },
            { href: "/images", label: "Images", icon: "🖼️" },
            { href: "/votes", label: "Votes", icon: "🗳️" },
        ],
    },
    {
        label: "AI pipeline",
        links: [
            { href: "/manage/prompt-chains", label: "Prompt chains", icon: "⛓️" },
            { href: "/manage/chain-steps", label: "Chain steps", icon: "🪜" },
            { href: "/manage/chain-mix", label: "Chain mix", icon: "🎛️" },
            { href: "/manage/terms", label: "Terms", icon: "📖" },
            { href: "/manage/examples", label: "Examples", icon: "✍️" },
        ],
    },
    {
        label: "Observability",
        links: [
            { href: "/manage/generation-requests", label: "Generation requests", icon: "📨" },
            { href: "/manage/llm-responses", label: "LLM responses", icon: "📡" },
        ],
    },
    {
        label: "Models",
        links: [
            { href: "/manage/llm-models", label: "LLM models", icon: "🤖" },
            { href: "/manage/llm-providers", label: "LLM providers", icon: "🏢" },
        ],
    },
    {
        label: "Access",
        links: [
            { href: "/manage/signup-domains", label: "Signup domains", icon: "🌐" },
            { href: "/manage/whitelisted-emails", label: "Whitelisted emails", icon: "✉️" },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="sidebar">
            <a href="/" className="brand">
                <span className="brand-mark">NYC</span>
                <span>
          Spots <span className="admin-badge">Admin</span>
        </span>
            </a>

            <nav className="side-nav">
                {groups.map((g) => (
                    <div key={g.label || "main"} className="side-group">
                        {g.label && <p className="side-group-label">{g.label}</p>}
                        {g.links.map((link) => {
                            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                            return (
                                <a key={link.href} href={link.href} className={`side-link${active ? " active" : ""}`}>
                                    <span>{link.icon}</span>
                                    {link.label}
                                </a>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <a href="https://nextjs-app-chi-blue.vercel.app" target="_blank" rel="noreferrer" className="side-footer">
                ↗ Open NYC Spots
            </a>
        </aside>
    );
}