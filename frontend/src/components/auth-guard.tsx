"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useSyncExternalStore } from "react";

import {
  getServerSessionToken,
  getSessionToken,
  subscribeToSession,
} from "@/lib/auth";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const token = useSyncExternalStore(
    subscribeToSession,
    getSessionToken,
    getServerSessionToken,
  );

  useEffect(() => {
    if (token === null) {
      router.replace("/login");
    }
  }, [router, token]);

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoaderCircle size={24} className="animate-spin text-indigo-600" />
        <span className="sr-only">Checking your session</span>
      </main>
    );
  }

  return children;
}
