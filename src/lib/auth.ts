import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { connectDB } from "./db";
import AdminUser from "@/models/AdminUser";
import Member from "@/models/Member";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/schemas/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        await connectDB();
        const { email, password } = parsed.data;

        // Check admin first
        const admin = await AdminUser.findOne({ email }).select("+passwordHash");
        if (admin) {
          const valid = await bcrypt.compare(password, admin.passwordHash);
          if (!valid) return null;
          return {
            id: admin._id.toString(),
            name: admin.name,
            email: admin.email,
            role: "admin" as const,
          };
        }

        // Check member
        const member = await Member.findOne({ email }).select("+passwordHash");
        if (member) {
          const valid = await bcrypt.compare(password, member.passwordHash);
          if (!valid) return null;
          return {
            id: member._id.toString(),
            name: member.name,
            email: member.email,
            role: "member" as const,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
