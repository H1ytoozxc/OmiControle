import { Key, Plug, Server, Network, GitBranch, Boxes } from "lucide-react";
import { Plate, PlateHeader, PlateTitle, PlateBody, Button, Badge } from "@/components/primitives";

const SECTIONS = [
  { id: "api-keys",   title: "API keys",         icon: Key,      blurb: "Manage personal access tokens and service credentials." },
  { id: "integrations", title: "Integrations",   icon: Plug,     blurb: "OIDC providers, SMTP, FCM, webhook receivers." },
  { id: "plugins",    title: "Plugin registry",  icon: Boxes,    blurb: "Signed WASM bundles, capability allow-lists." },
  { id: "network",    title: "Network",          icon: Network,  blurb: "Internal mTLS, ingress, allowed device origins." },
  { id: "infra",      title: "Infrastructure",   icon: Server,   blurb: "Postgres, Redis, object storage endpoints." },
  { id: "deploy",     title: "Deployments",      icon: GitBranch, blurb: "Argo CD wiring · GitOps cadence · canary policies." },
];

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <header className="fade-up">
        <div className="eyebrow mb-2">/ settings</div>
        <h1 className="display-italic text-[44px] leading-none text-bone">Configuration</h1>
        <p className="text-[12.5px] font-mono text-bone-dim mt-2">tenant · production · region: us-west-2</p>
      </header>

      <div className="grid grid-cols-12 gap-5 fade-up" style={{ ["--d" as never]: "80ms" }}>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Plate key={s.id} className="col-span-4 scan-overlay group cursor-pointer">
              <PlateBody className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-md bg-ink-100 border border-white/[0.08] grid place-items-center group-hover:border-ember/30 transition-colors">
                    <Icon className="w-4 h-4 text-bone-muted group-hover:text-ember transition-colors" strokeWidth={1.6} />
                  </span>
                  <div>
                    <div className="text-bone text-[15px] group-hover:text-ember transition-colors">{s.title}</div>
                    <div className="text-[10.5px] font-mono text-bone-dim">{s.id}</div>
                  </div>
                  <Badge size="xs" tone="bone" className="ml-auto">configure</Badge>
                </div>
                <p className="text-[12.5px] text-bone-muted leading-relaxed">{s.blurb}</p>
              </PlateBody>
            </Plate>
          );
        })}
      </div>

      {/* api keys preview */}
      <Plate className="fade-up" style={{ ["--d" as never]: "200ms" }}>
        <PlateHeader>
          <PlateTitle label="Service tokens · live" subtle="6 active · 2 expiring" live ts="REALTIME" />
          <Button size="sm" variant="ember">Issue token</Button>
        </PlateHeader>
        <PlateBody className="p-0">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="eyebrow text-left">
                <th className="pl-4 py-2 font-normal">Name</th>
                <th className="py-2 font-normal">Token</th>
                <th className="py-2 font-normal">Scopes</th>
                <th className="py-2 font-normal">Last used</th>
                <th className="py-2 font-normal">Expires</th>
                <th className="pr-4 py-2 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "ci-pipeline", token: "sk_…N1pV", scopes: ["workflows.run", "devices.read"], used: "4m ago",  exp: "2026-07-12" },
                { name: "metrics-bot", token: "sk_…7gFq", scopes: ["telemetry.read"],                 used: "1h ago",  exp: "2026-12-01" },
                { name: "edge-bridge", token: "sk_…2KdM", scopes: ["devices.command"],                used: "now",     exp: "2026-06-04" },
              ].map((t, i) => (
                <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="pl-4 py-3 text-bone">{t.name}</td>
                  <td className="py-3 font-mono text-bone-muted tracking-wider">{t.token}</td>
                  <td className="py-3">
                    {t.scopes.map((s) => <Badge key={s} size="xs" tone="bone" className="mr-1">{s}</Badge>)}
                  </td>
                  <td className="py-3 font-mono text-bone-dim">{t.used}</td>
                  <td className="py-3 font-mono text-bone-dim">{t.exp}</td>
                  <td className="pr-4 py-3 text-right">
                    <Button size="xs" variant="ghost">Revoke</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PlateBody>
      </Plate>
    </div>
  );
}
