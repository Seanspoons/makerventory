import Link from "next/link";
import { KeyRound } from "lucide-react";
import { requestPasswordReset } from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  return (
    <main className="app-shell-grid flex min-h-screen items-center justify-center px-3 py-8 sm:px-4 sm:py-10">
      <Card className="w-full max-w-md p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Password reset
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Reset your password
            </h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Enter your account email and Makerventory will prepare a reset link.
        </p>

        <form action={requestPasswordReset} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-500">Email</label>
            <Input name="email" type="email" autoComplete="email" required />
          </div>
          <SubmitButton className="w-full">Request reset</SubmitButton>
          <p className="text-center text-sm text-slate-500">
            <Link href="/sign-in" className="font-medium text-slate-950 underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
