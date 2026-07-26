"use client";

import { MoreHorizontal } from "lucide-react";
import { useSyncExternalStore } from "react";

import type { AuthUser } from "@/lib/auth";

type DashboardUserProps = {
  variant: "profile" | "avatar" | "greeting";
};

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("auth-session-changed", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("auth-session-changed", onStoreChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem("auth_user");
}

function getServerSnapshot() {
  return null;
}

function parseUser(value: string | null): AuthUser | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    return null;
  }
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function DashboardUser({ variant }: DashboardUserProps) {
  const storedUser = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const user = parseUser(storedUser);
  const name = user?.name ?? "User";
  const email = user?.email ?? "";
  const initials = getInitials(name) || "U";

  if (variant === "greeting") {
    return <>Welcome back, {name.split(/\s+/)[0]}</>;
  }

  if (variant === "avatar") {
    return (
      <div className="ml-1 flex size-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white lg:hidden">
        {initials}
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-3 border-t border-slate-100 px-2 pt-5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-xs text-slate-400">{email}</p>
      </div>
      <MoreHorizontal size={17} className="shrink-0 text-slate-400" />
    </div>
  );
}
