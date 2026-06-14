"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <p className="text-sm font-semibold text-primary md:hidden">MFD Tools</p>
      <span className="hidden md:block" />
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </span>
        <span className="hidden text-right sm:block">
          <p className="text-sm font-medium">{session?.user?.name ?? "MFD"}</p>
          <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </span>
    </header>
  );
}
