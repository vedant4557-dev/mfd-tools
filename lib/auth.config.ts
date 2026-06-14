import type { NextAuthConfig } from "next-auth";

const dashboardPrefixes = [
  "/dashboard",
  "/clients",
  "/decks",
  "/generate",
  "/settings",
];

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isAuthRoute =
        pathname.startsWith("/login") || pathname.startsWith("/register");
      const isDashboardRoute = dashboardPrefixes.some((p) =>
        pathname.startsWith(p)
      );

      if (isDashboardRoute && !isLoggedIn) return false;
      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      if (pathname === "/") {
        return Response.redirect(
          new URL(isLoggedIn ? "/dashboard" : "/login", request.nextUrl)
        );
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
