import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 w-full max-w-md animate-pulse rounded-lg bg-muted" />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
