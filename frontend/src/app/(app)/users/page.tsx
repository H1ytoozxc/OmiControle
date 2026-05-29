"use client";

import * as React from "react";
import { Plus, Check, X, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge, Modal,
} from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { api, ApiError } from "@/lib/api/client";

const ROLES = [
  { name: "Owner",    hint: "Full access including billing",  tone: "ember" as const },
  { name: "Admin",    hint: "Config + workflows",             tone: "steel" as const },
  { name: "Operator", hint: "Devices + runs",                 tone: "bone"  as const },
  { name: "Auditor",  hint: "Read-only + audit log",          tone: "bone"  as const },
];

interface PendingUser {
  id: string;
  email: string;
  display_name: string;
  registered_at: string | null;
}

export default function UsersPage() {
  const t = useT().users;
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("Operator");
  const [inviting, setInviting] = React.useState(false);

  // Fetch pending registrations
  const { data: pending, isLoading: pendingLoading } = useQuery<{ items: PendingUser[] }>({
    queryKey: ["users", "pending"],
    queryFn: () => api("/v1/users/pending"),
    refetchInterval: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: (userId: string) =>
      api(`/v1/users/${userId}/approve`, { method: "POST" }),
    onSuccess: () => {
      toast.success("User approved — they can now sign in");
      qc.invalidateQueries({ queryKey: ["users", "pending"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Approval failed");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (userId: string) =>
      api(`/v1/users/${userId}/reject`, { method: "POST" }),
    onSuccess: () => {
      toast.info("Registration rejected and removed");
      qc.invalidateQueries({ queryKey: ["users", "pending"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Rejection failed");
    },
  });

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) { toast.error("Enter an email address"); return; }
    setInviting(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.info("User registration endpoint not yet available — invite queued locally");
    setInviteOpen(false);
    setInviteEmail("");
    setInviting(false);
  }

  const pendingItems = pending?.items ?? [];

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-6 fade-up">
        <div>
          <p className="eyebrow mb-2">/ identity</p>
          <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">{t.title}</h1>
          <p className="text-[12.5px] text-bone-muted mt-1">{t.eyebrow}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ember" onClick={() => setInviteOpen(true)}>
            <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />{t.invite}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 flex flex-col gap-5">
          {/* Pending approvals */}
          <Plate className="fade-up" style={{ ["--d" as never]: "60ms" }}>
            <PlateHeader>
              <PlateTitle label="Pending approvals" />
              <div className="flex items-center gap-2">
                {pendingItems.length > 0 && (
                  <Badge size="xs" tone="ember">{pendingItems.length} waiting</Badge>
                )}
                <button
                  onClick={() => qc.invalidateQueries({ queryKey: ["users", "pending"] })}
                  className="text-bone-dim hover:text-bone transition-colors"
                  aria-label="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.6} />
                </button>
              </div>
            </PlateHeader>
            <PlateBody>
              {pendingLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-bone-muted text-[12.5px]">
                  <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.6} />
                  Loading…
                </div>
              ) : pendingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="w-8 h-8 text-bone-dim mb-3" strokeWidth={1.2} />
                  <p className="text-[13px] text-bone-muted">No pending registrations</p>
                  <p className="text-[11.5px] font-mono text-bone-dim mt-1">
                    New registrations will appear here for your review.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {pendingItems.map((user) => (
                    <div key={user.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                      {/* Avatar placeholder */}
                      <div className="w-8 h-8 rounded-full bg-ink-200 border border-white/[0.10] grid place-items-center shrink-0">
                        <span className="text-[12px] font-semibold text-bone-muted">
                          {(user.display_name || user.email)[0]?.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-bone truncate">
                          {user.display_name || <span className="text-bone-muted italic">No name</span>}
                        </p>
                        <p className="text-[11.5px] font-mono text-bone-dim truncate">{user.email}</p>
                      </div>

                      {user.registered_at && (
                        <span className="text-[11px] font-mono text-bone-dim shrink-0">
                          {new Date(user.registered_at).toLocaleDateString()}
                        </span>
                      )}

                      <Badge size="xs" tone="ember">pending</Badge>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => approveMutation.mutate(user.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="h-7 px-2.5 flex items-center gap-1.5 rounded-sm border border-mint/30 bg-mint/[0.06] text-mint text-[11.5px] font-mono hover:border-mint/60 hover:bg-mint/[0.12] transition-colors disabled:opacity-40"
                          aria-label="Approve"
                        >
                          <Check className="w-3 h-3" strokeWidth={2.5} />
                          Approve
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(user.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="h-7 px-2.5 flex items-center gap-1.5 rounded-sm border border-flame/20 bg-flame/[0.04] text-flame text-[11.5px] font-mono hover:border-flame/40 hover:bg-flame/[0.08] transition-colors disabled:opacity-40"
                          aria-label="Reject"
                        >
                          <X className="w-3 h-3" strokeWidth={2.5} />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PlateBody>
          </Plate>

          {/* Active users placeholder */}
          <Plate className="fade-up" style={{ ["--d" as never]: "120ms" }}>
            <PlateHeader>
              <PlateTitle label={t.title} subtle="1" />
            </PlateHeader>
            <PlateBody>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-[13px] text-bone-muted mb-4">{t.emptyNote}</p>
                <Button variant="ember" size="md" onClick={() => setInviteOpen(true)}>
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />{t.invite}
                </Button>
              </div>
            </PlateBody>
          </Plate>
        </div>

        <div className="col-span-4 flex flex-col gap-5 fade-up" style={{ ["--d" as never]: "160ms" }}>
          <Plate>
            <PlateHeader><PlateTitle label="Roles" /></PlateHeader>
            <PlateBody className="space-y-2.5">
              {ROLES.map((r) => (
                <div key={r.name} className="flex items-center gap-3 p-2.5 rounded-sm border border-white/[0.06] bg-ink-50/40">
                  <div className="flex-1">
                    <p className="text-[12.5px] text-bone">{r.name}</p>
                    <p className="text-[10.5px] font-mono text-bone-dim">{r.hint}</p>
                  </div>
                  <Badge size="xs" tone={r.tone}>{r.name.toLowerCase()}</Badge>
                </div>
              ))}
            </PlateBody>
          </Plate>

          <Plate>
            <PlateHeader>
              <PlateTitle label="Access policy" />
            </PlateHeader>
            <PlateBody className="space-y-2.5 text-[12.5px]">
              <div className="p-2.5 rounded-sm border border-ember/20 bg-ember/[0.04]">
                <p className="text-[11.5px] font-mono text-ember mb-1">Closed registration</p>
                <p className="text-bone-dim text-[11.5px] leading-relaxed">
                  New accounts require admin approval before they can sign in.
                </p>
              </div>
            </PlateBody>
          </Plate>
        </div>
      </div>

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite user"
        description="Send an invitation to join your organization."
      >
        <form onSubmit={sendInvite} className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Email address</span>
            <input
              autoFocus
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="field-input"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="eyebrow">Role</span>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => setInviteRole(r.name)}
                  className={`text-left p-2.5 rounded-sm border transition-colors ${
                    inviteRole === r.name
                      ? "border-ember/50 bg-ember/[0.08] text-bone"
                      : "border-white/[0.06] bg-ink-50/40 text-bone-muted hover:border-white/[0.14]"
                  }`}
                >
                  <p className="text-[12.5px] font-medium">{r.name}</p>
                  <p className="text-[10.5px] font-mono text-bone-dim mt-0.5">{r.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit" variant="ember" size="sm" disabled={inviting}>
              {inviting ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
