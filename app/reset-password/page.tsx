import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { resetPassword } from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPasswordPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const token = typeof searchParams.token === "string" ? searchParams.token : "";

  if (!token) {
    redirect("/forgot-password");
  }

  return (
    <main className="app-shell-grid flex min-h-screen items-center justify-center px-3 py-8 sm:px-4 sm:py-10">
      <Card className="w-full max-w-md p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Create new password
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Finish password reset
            </h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Set a new password for your Makerventory account.
        </p>

        <form action={resetPassword} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <label className="mb-2 block text-sm text-slate-500">New password</label>
            <Input name="password" type="password" autoComplete="new-password" required />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-500">Confirm new password</label>
            <Input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <SubmitButton className="w-full">Reset password</SubmitButton>
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
