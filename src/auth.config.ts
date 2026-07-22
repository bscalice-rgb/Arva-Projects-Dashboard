import type { NextAuthConfig } from "next-auth";

// Edge-safe base config (no Node-only deps like bcrypt). Shared by middleware
// and the full auth instance. Providers are added in src/auth.ts.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/api/auth")) return true;
      if (pathname === "/login") {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", request.nextUrl.origin));
        }
        return true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) token.userId = (user as { id: string }).id;
      return token;
    },
    session({ session, token }) {
      if (token.userId && session.user) {
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
