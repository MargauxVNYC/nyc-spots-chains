import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import SignOutButton from "./components/SignOutButton";
import { createClient } from "../lib/supabase/server";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Admin · NYC Spots",
  description: "Admin area for NYC Spots",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase
        .from("profiles")
        .select("is_superadmin")
        .eq("id", user.id)
        .single();
    isAdmin = data?.is_superadmin === true;
  }

  const meta = user?.user_metadata ?? {};
  const name = meta.full_name ?? meta.name ?? user?.email;
  const avatar = meta.avatar_url ?? meta.picture;

  return (
      <html lang="en">
      <body className={geist.variable}>
      {isAdmin ? (
          <div className="shell">
            <Sidebar />
            <div className="main">
              <header className="topbar">
                <span className="topbar-label">🔒 Admin area · superadmins only</span>
                <div className="user-chip">
                  {avatar && <img src={avatar} alt="" referrerPolicy="no-referrer" />}
                  <div className="user-text">
                    <div className="user-name">{name}</div>
                    <div className="user-role">Superadmin</div>
                  </div>
                  <SignOutButton />
                </div>
              </header>
              <div className="content">{children}</div>
            </div>
          </div>
      ) : (
          children
      )}
      </body>
      </html>
  );
}