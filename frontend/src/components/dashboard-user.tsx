"use client";

import {
  CalendarDays,
  CircleHelp,
  LogOut,
  Mail,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import {
  API_URL,
  clearSession,
  getSessionToken,
  saveUser,
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

export function UserInformationCard() {
  const storedUser = useSyncExternalStore(
    subscribeToSession,
    getSnapshot,
    getServerSnapshot,
  );
  const user = parseUser(storedUser);
  const initials = getInitials(user?.name ?? "User") || "U";

  useEffect(() => {
    if (user?.created_at) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const token = getSessionToken();
      if (!token) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          clearSession();
          return;
        }

        if (response.ok) {
          saveUser((await response.json()) as AuthUser);
        }
      } catch {
        // Existing profile data remains visible if refreshing it fails.
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [user?.created_at]);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
      <div className="absolute -top-10 -right-8 size-36 rounded-full bg-indigo-500/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-bold text-white ring-2 ring-white/10">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {user?.name ?? "User"}
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
              <Mail size={12} className="shrink-0" />
              <span className="truncate">{user?.email ?? "Unavailable"}</span>
            </div>
          </div>
          <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
            Active
          </span>
        </div>

        <div className="mt-4 flex justify-end items-center gap-2 border-t border-white/10 pt-3 text-xs text-slate-400">
          <CalendarDays size={13} className="shrink-0" />
          <span>Joined</span>
          <span className="ml-auto font-medium text-slate-200">
            {user?.created_at
              ? formatJoinedDate(user.created_at)
              : "Loading..."}
          </span>
        </div>

      </div>
    </section>
  );
}

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
