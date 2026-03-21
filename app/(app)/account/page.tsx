import { redirect } from "next/navigation";
import {
  changeAccountPassword,
  revokeAllSessions,
  updateAccountProfile,
  updateWorkspaceProfile,
} from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { ConfirmActionForm } from "@/components/inventory/confirm-action-form";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { titleCase } from "@/lib/utils";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id || !session.user.workspaceId) {
    redirect("/sign-in");
  }

  const [user, workspace] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
      },
    }),
    prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
      select: {
        name: true,
      },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="My Account"
        description="Manage your profile, workspace identity, and password. This is the control surface for the account that owns the current workspace."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Profile"
          description="These details are used for your sign-in identity and audit trail attribution."
        >
          <form action={updateAccountProfile} className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm text-slate-500">Name</label>
              <Input name="name" defaultValue={user?.name ?? ""} required />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-500">Email</label>
              <Input
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={user?.email ?? ""}
                required
              />
            </div>
            <div>
              <SubmitButton>Save profile</SubmitButton>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Workspace"
          description="Your current workspace owns the inventory, audit trail, and operational history for this account."
        >
          <form action={updateWorkspaceProfile} className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm text-slate-500">Workspace name</label>
              <Input name="workspaceName" defaultValue={workspace?.name ?? ""} required />
            </div>
            <div>
              <SubmitButton>Save workspace</SubmitButton>
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard
        title="Password"
        description="Use a long unique password. Password changes require your current password."
      >
        <form action={changeAccountPassword} className="grid gap-4 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-slate-500">Current password</label>
            <Input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-500">New password</label>
            <Input
              name="nextPassword"
              type="password"
              autoComplete="new-password"
              required
            />
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
          <div className="lg:col-span-3">
            <SubmitButton>Change password</SubmitButton>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Sessions"
        description="Manage where your account stays signed in. Sign out all devices if you changed your password or want to reset access everywhere."
      >
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm leading-6 text-slate-600">
            <p className="font-medium text-slate-950">Current access</p>
            <p className="mt-1">Access level: {titleCase(session.user.workspaceRole)}</p>
            <p>Workspace: {workspace?.name ?? "Workspace"}</p>
          </div>
          <ConfirmActionForm
            action={revokeAllSessions}
            title="Revoke all sessions"
            description="This invalidates every active session for your account, including this device. You will need to sign in again."
            confirmLabel="Revoke sessions"
            triggerLabel="Sign out all sessions"
            triggerVariant="secondary"
          >
            <div className="rounded-[18px] bg-slate-50 p-3 text-sm text-slate-600">
              Use this after a password change or if you suspect another device still has access.
            </div>
          </ConfirmActionForm>
        </div>
      </SectionCard>
    </div>
  );
}
