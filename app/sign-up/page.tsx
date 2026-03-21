import Link from "next/link";
import { UserRoundPlus } from "lucide-react";
import { signUpUser } from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignUpPage() {
  return (
    <main className="app-shell-grid flex min-h-screen items-center justify-center px-3 py-8 sm:px-4 sm:py-10">
      <Card className="w-full max-w-lg p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <UserRoundPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Create account
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Set up Makerventory
            </h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Create your own workspace and start building your inventory from your real workshop data.
        </p>

        <form action={signUpUser} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-slate-500">Your name</label>
            <Input name="name" autoComplete="name" required />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-500">Workspace name</label>
              <Input
                name="workspaceName"
                placeholder="North Forge Print Lab"
                autoComplete="organization"
                required
              />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm text-slate-500">Email</label>
            <Input name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-500">Password</label>
            <Input name="password" type="password" autoComplete="new-password" required />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-500">Confirm password</label>
            <Input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="sm:col-span-2 space-y-3">
            <SubmitButton className="w-full">Create account</SubmitButton>
            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/sign-in" className="font-medium text-slate-950 underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </main>
  );
}
