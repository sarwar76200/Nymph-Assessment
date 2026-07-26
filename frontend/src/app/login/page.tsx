import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Sign in | Nymph Support",
  description: "Sign in to your Nymph Support account.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
