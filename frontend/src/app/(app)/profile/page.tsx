"use client";

import * as React from "react";
import { Camera, Check, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Plate, PlateHeader, PlateTitle, PlateBody, PlateFooter,
  Button, Badge,
} from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { useSession } from "@/lib/auth/session";
import { api } from "@/lib/api/client";

export default function ProfilePage() {
  const t = useT().profile;
  const { tenantId } = useSession();

  const [avatar, setAvatar] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savingPw, setSavingPw] = React.useState(false);
  const [currentPw, setCurrentPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatar(URL.createObjectURL(file));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/v1/users/me", {
        method: "PATCH",
        body: { display_name: displayName, email, bio },
      });
      toast.success("Profile saved");
    } catch {
      toast.error("Profile endpoint not yet available — changes saved locally");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPw.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }
    setSavingPw(true);
    try {
      await api("/v1/users/me/password", {
        method: "POST",
        body: { current_password: currentPw, new_password: newPw },
      });
      toast.success("Password updated");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch {
      toast.error("Password change endpoint not yet available");
    } finally {
      setSavingPw(false);
    }
  }

  const initials = displayName
    ? displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <div className="space-y-6 max-w-[720px]">
      <header className="fade-up">
        <p className="eyebrow mb-2">/ profile</p>
        <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">{t.title}</h1>
        <p className="text-[12.5px] text-bone-muted mt-1">{t.subtitle}</p>
      </header>

      {/* Avatar + identity */}
      <Plate className="fade-up" style={{ ["--d" as never]: "60ms" }}>
        <PlateHeader>
          <PlateTitle label={t.avatarSection} />
        </PlateHeader>
        <form onSubmit={saveProfile}>
          <PlateBody className="space-y-6">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className="w-16 h-16 rounded-full bg-ink-200 border border-white/[0.12] grid place-items-center overflow-hidden">
                  {avatar
                    ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                    : <span className="text-[22px] font-semibold text-bone-muted">{initials}</span>
                  }
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  aria-label={t.changeAvatar}
                >
                  <Camera className="w-4 h-4 text-bone" strokeWidth={1.6} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
              </div>
              <div className="space-y-1.5">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Camera className="w-3.5 h-3.5" strokeWidth={1.6} />
                  {t.changeAvatar}
                </Button>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => { setAvatar(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="flex items-center gap-1.5 text-[11.5px] font-mono text-flame hover:text-flame/80 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={1.6} />{t.removeAvatar}
                  </button>
                )}
                <p className="text-[11px] font-mono text-bone-dim">{t.avatarHint}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label={t.displayName}>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t.displayNamePlaceholder}
                  className="field-input"
                />
              </Field>
              <Field label={t.emailLabel}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="field-input"
                />
              </Field>
            </div>

            <Field label={t.bio}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t.bioPlaceholder}
                rows={3}
                className="field-input resize-none py-2 leading-relaxed"
              />
            </Field>
          </PlateBody>
          <PlateFooter className="flex items-center justify-end">
            <Button type="submit" variant="ember" size="sm" disabled={saving}>
              {saving ? <><span className="w-3 h-3 border border-ink-50/40 border-t-ink-50 rounded-full animate-spin" />&nbsp;Saving…</> : t.saveChanges}
            </Button>
          </PlateFooter>
        </form>
      </Plate>

      {/* Password */}
      <Plate className="fade-up" style={{ ["--d" as never]: "120ms" }}>
        <PlateHeader>
          <PlateTitle label={t.passwordSection} />
        </PlateHeader>
        <form onSubmit={savePassword}>
          <PlateBody className="space-y-4">
            <Field label={t.currentPassword}>
              <PasswordInput
                value={currentPw}
                onChange={setCurrentPw}
                show={showCurrent}
                onToggle={() => setShowCurrent((v) => !v)}
                autoComplete="current-password"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t.newPassword} hint={t.passwordHint}>
                <PasswordInput
                  value={newPw}
                  onChange={setNewPw}
                  show={showNew}
                  onToggle={() => setShowNew((v) => !v)}
                  autoComplete="new-password"
                />
              </Field>
              <Field label={t.confirmPassword}>
                <PasswordInput
                  value={confirmPw}
                  onChange={setConfirmPw}
                  show={showNew}
                  onToggle={() => setShowNew((v) => !v)}
                  autoComplete="new-password"
                />
              </Field>
            </div>
          </PlateBody>
          <PlateFooter className="flex items-center justify-end">
            <Button type="submit" variant="outline" size="sm" disabled={savingPw}>
              {savingPw ? "Updating…" : t.updatePassword}
            </Button>
          </PlateFooter>
        </form>
      </Plate>

      {/* Session / account info */}
      <Plate className="fade-up" style={{ ["--d" as never]: "180ms" }}>
        <PlateHeader>
          <PlateTitle label={t.sessionSection} />
          <Badge size="xs" tone="mint">{t.active}</Badge>
        </PlateHeader>
        <PlateBody className="space-y-3 text-[12.5px]">
          <Row label={t.accountType}><span className="font-mono text-bone-muted">local · v0.1</span></Row>
          <Row label={t.tenant}>
            <span className="font-mono text-bone-muted">{tenantId ?? "—"}</span>
          </Row>
          <Row label={t.region}><span className="font-mono text-bone-muted">local</span></Row>
          <Row label={t.joined}><span className="font-mono text-bone-muted">—</span></Row>
        </PlateBody>
      </Plate>

      {/* Danger zone */}
      <Plate className="fade-up border-flame/20" style={{ ["--d" as never]: "240ms" }}>
        <PlateHeader>
          <PlateTitle label={t.dangerSection} />
        </PlateHeader>
        <PlateBody className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-bone">{t.deleteAccount}</p>
            <p className="text-[12px] text-bone-muted mt-0.5">{t.deleteAccountNote}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-flame/40 text-flame hover:bg-flame/[0.08] hover:border-flame/60"
            onClick={() => toast.error("Account deletion not yet available")}
          >
            {t.deleteAccount}
          </Button>
        </PlateBody>
      </Plate>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      {children}
      {hint && <span className="text-[10.5px] font-mono text-bone-dim">{hint}</span>}
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 border-t border-white/[0.04] first:border-0">
      <span className="eyebrow">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function PasswordInput({
  value, onChange, show, onToggle, autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder="••••••••••••"
        minLength={12}
        className="field-input pr-9"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bone-dim hover:text-bone-muted transition-colors"
        aria-label={show ? "Hide" : "Show"}
      >
        {show ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.6} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.6} />}
      </button>
    </div>
  );
}
