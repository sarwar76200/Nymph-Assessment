import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Create account | Nymph Support",
  description: "Create your Nymph Support account.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
