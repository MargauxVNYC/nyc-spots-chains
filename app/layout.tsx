import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import SignOutButton from "./components/SignOutButton";
import ThemeToggle from "./components/ThemeToggle";
import { createClient } from "../lib/supabase/server";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Prompt Chains · NYC Spots",
  description: "Build, reorder, and run prompt chains for NYC Spots",
};

// Runs before the page renders, so the saved theme is applied with no flash.
const themeScript = `
try {
  var p = localStorage.getItem("theme") || "system";
  var d = p === "dark" || (p === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = d ? "dark" : "light";
} catch (e) {}
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from("profiles").select("is_superadmin").eq("id", user.id).single();
    isAdmin = data?.is_superadmin === true;
  }

  const meta = user?.user_metadata ?? {};
  const name = meta.full_name ?? meta.name ?? user?.email;
  const avatar = meta.avatar_url ?? meta.picture;

  return (
      <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={geist.variable}>
      {isAdmin ? (
          <div className="shell">
            <Sidebar />
            <div className="main">
              <header className="topbar">
                <span className="topbar-label">⛓️ Prompt Chain Tool · superadmins only</span>
                <div className="topbar-right">
                  <ThemeToggle />
                  <div className="user-chip">
                    {avatar && <img src={avatar} alt="" referrerPolicy="no-referrer" />}
                    <div className="user-text">
                      <div className="user-name">{name}</div>
                      <div className="user-role">Superadmin</div>
                    </div>
                    <SignOutButton />
                  </div>
                </div>
              </header>
              <div className="content">{children}</div>
            </div>
          </div>
      ) : (
          <>
            <div className="floating-theme">
              <ThemeToggle />
            </div>
            {children}
          </>
      )}
      </body>
      </html>
  );
}