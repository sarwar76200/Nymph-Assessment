"use client";

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { authenticate, AuthMode, saveSession } from "@/lib/auth";

type AuthFormProps = {
  mode: AuthMode;
};

const benefits = [
  "Get instant help from AI support agents",
  "Keep all your conversations in one place",
  "Upload documents for more relevant answers",
];

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (isSignup && !name) {
      setError("Please enter your name.");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      setIsSubmitting(false);
      return;
    }

    try {
      const session = await authenticate(mode, {
        ...(isSignup ? { name } : {}),
        email,
        password,
      });
      saveSession(session);
      router.replace("/dashboard");
      router.refresh();
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(480px,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 size-80 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />

        <Link href="/" className="relative flex w-fit items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-950/30">
            <Sparkles size={20} strokeWidth={2.5} />
          </span>
          <span>
            <span className="block text-base font-bold tracking-tight">Nymph Support</span>
            <span className="block text-[11px] font-medium text-slate-400">AI workspace</span>
          </span>
        </Link>

        <div className="relative my-auto max-w-xl pb-12">
          <div className="mb-7 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <ShieldCheck size={23} className="text-indigo-300" />
          </div>
          <h1 className="max-w-lg text-4xl leading-[1.15] font-bold tracking-tight xl:text-5xl">
            Support that understands what you need.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
            Talk to specialized AI agents, revisit past conversations, and get useful answers
            whenever you need them.
          </p>

          <ul className="mt-10 space-y-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 size={18} className="shrink-0 text-indigo-400" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          Private, secure, and available around the clock.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 flex w-fit items-center gap-3 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Sparkles size={18} />
            </span>
            <span className="font-bold tracking-tight">Nymph Support</span>
          </Link>

          <div>
            <p className="text-sm font-semibold text-indigo-600">
              {isSignup ? "Create your account" : "Welcome back"}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {isSignup ? "Get started with Nymph" : "Sign in to your account"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {isSignup
                ? "Create an account to start chatting with your AI support agents."
                : "Enter your details to continue to your support dashboard."}
            </p>
          </div>

          <form method="post" onSubmit={handleSubmit} className="mt-8 space-y-5">
            {isSignup && (
              <Field
                id="name"
                label="Full name"
                type="text"
                placeholder="Alex Smith"
                autoComplete="name"
                icon={<User size={17} />}
              />
            )}

            <Field
              id="email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              icon={<Mail size={17} />}
            />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  Password
                </label>
                {!isSignup && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <LockKeyhole
                  size={17}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  maxLength={128}
                  required
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder="At least 8 characters"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-11 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {isSignup && (
                <p className="mt-2 text-xs text-slate-400">Use 8 or more characters.</p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  {isSignup ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                <>
                  {isSignup ? "Create account" : "Sign in"}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {isSignup ? "Sign in" : "Create one"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

type FieldProps = {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  autoComplete: string;
  icon: React.ReactNode;
};

function Field({ id, label, type, placeholder, autoComplete, icon }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          id={id}
          name={id}
          type={type}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
        />
      </div>
    </div>
  );
}
