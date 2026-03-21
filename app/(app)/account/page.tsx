import { redirect } from "next/navigation";
import { changeAccountPassword, updateAccountProfile, updateWorkspaceProfile } from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
        slug: true,
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
              <label className="mb-2 block text-sm text-slate-500">Workspace slug</label>
              <Input value={workspace?.slug ?? ""} disabled readOnly />
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
    </div>
  );
}
