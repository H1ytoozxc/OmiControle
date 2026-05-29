import { ShieldCheck, KeyRound, Smartphone, Plus, MoreHorizontal, Fingerprint } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody, Button, Badge, SignalDot,
} from "@/components/primitives";

const USERS = [
  { name: "Helena Vu",       email: "helena@sequoia.io",    role: "Owner",     mfa: "webauthn", last: "now",     sessions: 3 },
  { name: "Marcus Lin",      email: "marcus@sequoia.io",    role: "Admin",     mfa: "webauthn", last: "12m",     sessions: 2 },
  { name: "Anya Kowalski",   email: "anya@sequoia.io",      role: "Operator",  mfa: "totp",     last: "1h",      sessions: 1 },
  { name: "Devi Subramanian", email: "devi@sequoia.io",     role: "Operator",  mfa: "totp",     last: "3h",      sessions: 1 },
  { name: "Pavel Stoica",    email: "pavel@sequoia.io",     role: "Auditor",   mfa: "none",     last: "2d",      sessions: 0 },
];

const ROLES = [
  { name: "Owner",   perms: 412, users: 1, hint: "full · including billing" },
  { name: "Admin",   perms: 358, users: 4, hint: "config + workflows" },
  { name: "Operator", perms: 142, users: 28, hint: "devices + runs" },
  { name: "Auditor", perms: 22,  users: 6, hint: "read · audit log" },
];

export default function UsersPage() {
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-6 fade-up">
        <div>
          <div className="eyebrow mb-2">/ identity</div>
          <h1 className="display-italic text-[44px] leading-none text-bone">Identity & access</h1>
          <p className="text-[12.5px] font-mono text-bone-dim mt-2">39 users · 4 roles · 412 permissions · 87% MFA coverage</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Audit log</Button>
          <Button variant="outline">Roles</Button>
          <Button variant="ember"><Plus className="w-3.5 h-3.5" strokeWidth={1.8} />Invite</Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-5">
        <Plate className="col-span-8 fade-up" style={{ ["--d" as never]: "80ms" }}>
          <PlateHeader>
            <PlateTitle label="Users" subtle="39 active" />
            <span className="eyebrow">sort · last seen</span>
          </PlateHeader>
          <PlateBody className="p-0">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="eyebrow text-left">
                  <th className="pl-4 py-2 font-normal">User</th>
                  <th className="py-2 font-normal">Role</th>
                  <th className="py-2 font-normal">2FA</th>
                  <th className="py-2 font-normal">Sessions</th>
                  <th className="py-2 font-normal">Last seen</th>
                  <th className="pr-4 py-2 font-normal w-8"></th>
                </tr>
              </thead>
              <tbody>
                {USERS.map((u) => (
                  <tr key={u.email} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="pl-4 py-3 flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-ember/60 to-flame/60 text-ink-50 grid place-items-center text-[10.5px] font-semibold">
                        {u.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-bone">{u.name}</span>
                        <span className="text-[10.5px] font-mono text-bone-dim">{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3"><Badge size="xs" tone={u.role === "Owner" ? "ember" : u.role === "Admin" ? "steel" : "bone"}>{u.role}</Badge></td>
                    <td className="py-3">
                      {u.mfa === "webauthn" && <span className="inline-flex items-center gap-1 text-mint"><Fingerprint className="w-3 h-3" />webauthn</span>}
                      {u.mfa === "totp"     && <span className="inline-flex items-center gap-1 text-bone-muted"><KeyRound className="w-3 h-3" />totp</span>}
                      {u.mfa === "none"     && <span className="inline-flex items-center gap-1 text-flame">none</span>}
                    </td>
                    <td className="py-3 font-mono text-bone-muted tabular-nums flex items-center gap-2">
                      {u.sessions} <Smartphone className="w-3 h-3 text-bone-dim" />
                    </td>
                    <td className="py-3 font-mono text-bone-dim">{u.last}</td>
                    <td className="pr-4 py-3"><MoreHorizontal className="w-4 h-4 text-bone-dim" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PlateBody>
        </Plate>

        <div className="col-span-4 flex flex-col gap-5 fade-up" style={{ ["--d" as never]: "160ms" }}>
          <Plate>
            <PlateHeader><PlateTitle label="Roles" /></PlateHeader>
            <PlateBody className="space-y-2.5">
              {ROLES.map((r) => (
                <div key={r.name} className="flex items-center gap-3 p-2.5 rounded-sm bg-ink-50/40 border border-white/[0.06]">
                  <span className="w-7 h-7 rounded-sm bg-ink-100 border border-white/[0.08] grid place-items-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-bone-muted" strokeWidth={1.6} />
                  </span>
                  <div className="flex-1">
                    <div className="text-[12.5px] text-bone">{r.name}</div>
                    <div className="text-[10.5px] font-mono text-bone-dim">{r.hint}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10.5px] eyebrow">USERS</div>
                    <div className="font-mono text-bone tabular-nums">{r.users}</div>
                  </div>
                </div>
              ))}
            </PlateBody>
          </Plate>

          <Plate>
            <PlateHeader><PlateTitle label="Sessions · live" live ts="REALTIME" /></PlateHeader>
            <PlateBody className="space-y-1.5">
              {[
                { ua: "Macbook · Safari",       ip: "84.21.…", at: "now",  cur: true },
                { ua: "Tauri desktop · macOS",  ip: "84.21.…", at: "1m",   cur: false },
                { ua: "iPhone · Sequoia app",   ip: "84.21.…", at: "12m",  cur: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between text-[11.5px]">
                  <span className="text-bone-muted flex items-center gap-2">
                    <SignalDot state="ok" pulse={s.cur} /> {s.ua}
                  </span>
                  <span className="font-mono text-bone-dim">{s.ip} · {s.at}</span>
                </div>
              ))}
            </PlateBody>
          </Plate>
        </div>
      </div>
    </div>
  );
}
