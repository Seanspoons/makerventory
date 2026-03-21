"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Route } from "next";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error) {
        setError("Invalid credentials or inactive account.");
        return;
      }

      router.push(callbackUrl as Route);
      router.refresh();
    });
  }

  return (
    <main className="app-shell-grid flex min-h-screen items-center justify-center px-3 py-8 sm:px-4 sm:py-10">
      <Card className="w-full max-w-md p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Welcome back
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Sign in to Makerventory
            </h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Sign in to manage your printers, materials, maintenance, and workshop operations.
        </p>

        <form action={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-500">Email</label>
            <Input name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-500">Password</label>
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
          <div className="space-y-3">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-center text-sm text-slate-500">
              Need an account?{" "}
              <Link href="/sign-up" className="font-medium text-slate-950 underline-offset-4 hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </main>
  );
}
