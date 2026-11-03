"use client";

import { usePathname } from "next/navigation";

export default function Sidebar() {
    const pathname = usePathname();
    const onChains = pathname === "/" || pathname.startsWith("/chains");

    return (
        <aside className="sidebar">
            <a href="/" className="brand">
                <span className="brand-mark">⛓️</span>
                <span>
          Chains <span className="admin-badge">Tool</span>
        </span>
            </a>

            <nav className="side-nav">
                <a href="/" className={`side-link${onChains ? " active" : ""}`}>
                    <span>⛓️</span>
                    Prompt chains
                </a>
            </nav>

            <div className="side-footer side-footer-links">
                <a href="https://nextjs-app-chi-blue.vercel.app" target="_blank" rel="noreferrer">↗ NYC Spots</a>
                <a href="https://nyc-spots-admin-rgmn.vercel.app" target="_blank" rel="noreferrer">↗ Admin</a>
            </div>
        </aside>
    );
}