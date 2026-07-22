import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "admin";

function verifyPassword(plain: string): boolean {
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (hash) {
    try {
      return bcrypt.compareSync(plain, hash);
    } catch {
      return false;
    }
  }
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return plain === expected;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        if (!adminEmail) return null;

        if (email.trim().toLowerCase() !== adminEmail) return null;
        if (!verifyPassword(password)) return null;

        return { id: ADMIN_USER_ID, email: adminEmail, name: "Admin" };
      },
    }),
  ],
});

/** The current owner id for the ownership seam. Single admin today. */
export function getCurrentUserId(): string {
  return ADMIN_USER_ID;
}
