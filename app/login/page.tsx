import SignInButton from "../components/SignInButton";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sign in · NYC Spots Admin" };

export default function LoginPage() {
    return (
        <main className="center-screen">
            <div className="panel center-card">
                <div className="lock">🔒</div>
                <p className="eyebrow">NYC Spots · Admin</p>
                <h1 className="title" style={{ fontSize: 28 }}>Restricted area</h1>
                <p className="muted" style={{ margin: "0 0 24px" }}>
                    Sign in with a Google account that has admin access.
                </p>
                <SignInButton />
            </div>
        </main>
    );
}