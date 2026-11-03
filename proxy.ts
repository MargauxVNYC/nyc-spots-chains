import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const path = request.nextUrl.pathname;
    const goTo = (pathname: string) => {
        const url = request.nextUrl.clone();
        url.pathname = pathname;
        url.search = "";
        return NextResponse.redirect(url);
    };

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 1) Not signed in: only /login and the sign-in callback are reachable.
    if (!user) {
        const isPublic = path.startsWith("/login") || path.startsWith("/auth");
        return isPublic ? response : goTo("/login");
    }

    // Let the sign-in callback finish.
    if (path.startsWith("/auth")) return response;

    // 2) Signed in: check the admin flag in the database.
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_superadmin")
        .eq("id", user.id)
        .single();
    const isAdmin = profile?.is_superadmin === true;

    if (!isAdmin) {
        return path.startsWith("/denied") ? response : goTo("/denied");
    }

    // 3) Admins don't need the login or denied pages.
    if (path.startsWith("/login") || path.startsWith("/denied")) return goTo("/");

    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};