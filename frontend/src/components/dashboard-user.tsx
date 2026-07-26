"use client";

import { CircleHelp, LogOut, MoreHorizontal, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import {
  clearSession,
  subscribeToSession,
  type AuthUser,
} from "@/lib/auth";

type DashboardUserProps = {
  variant: "profile" | "avatar" | "greeting";
};

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
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const storedUser = useSyncExternalStore(
    subscribeToSession,
    getSnapshot,
    getServerSnapshot,
  );
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

  function handleLogout() {
    clearSession();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="relative mt-4 flex items-center gap-3 border-t border-slate-100 px-2 pt-5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-xs text-slate-400">{email}</p>
      </div>
      <button
        type="button"
        aria-label="Open user menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((open) => !open)}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <MoreHorizontal size={17} />
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 bottom-12 z-30 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <Settings size={16} />
            Account settings
          </button>
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <CircleHelp size={16} />
            Help & support
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
