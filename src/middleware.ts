import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe middleware: uses only the base config (no bcrypt). Route protection
// is handled by the `authorized` callback in auth.config.ts.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
  // The authorized() callback decides access; nothing else needed here.
  return;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
