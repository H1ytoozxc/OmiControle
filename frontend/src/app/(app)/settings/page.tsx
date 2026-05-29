import { Key, Plug, Server, Network, GitBranch, Boxes } from "lucide-react";
import { Plate, PlateHeader, PlateTitle, PlateBody, Button, Badge } from "@/components/primitives";

const SECTIONS = [
  { id: "api-keys",      title: "API keys",        icon: Key,       blurb: "Manage personal access tokens and service credentials." },
  { id: "integrations",  title: "Integrations",    icon: Plug,      blurb: "OIDC providers, SMTP, FCM, webhook receivers." },
  { id: "plugins",       title: "Plugin registry", icon: Boxes,     blurb: "Signed WASM bundles, capability allow-lists." },
  { id: "network",       title: "Network",         icon: Network,   blurb: "Internal mTLS, ingress, allowed device origins." },
  { id: "infra",         title: "Infrastructure",  icon: Server,    blurb: "Postgres, Redis, object storage endpoints." },
  { id: "deploy",        title: "Deployments",     icon: GitBranch, blurb: "GitOps cadence, canary policies." },
];

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <header className="fade-up">
        <p className="eyebrow mb-2">/ settings</p>
        <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">Configuration</h1>
        <p className="text-[12.5px] text-bone-muted mt-1">Manage your organization settings and integrations.</p>
      </header>

      <div className="grid grid-cols-12 gap-4 fade-up" style={{ ["--d" as never]: "80ms" }}>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Plate key={s.id} className="col-span-4 group cursor-pointer">
              <PlateBody className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-md bg-ink-100 border border-white/[0.08] grid place-items-center group-hover:border-ember/30 transition-colors">
                    <Icon className="w-4 h-4 text-bone-muted group-hover:text-ember transition-colors" strokeWidth={1.6} />
                  </span>
                  <div>
                    <p className="text-[13px] text-bone group-hover:text-ember transition-colors">{s.title}</p>
                    <p className="text-[10.5px] font-mono text-bone-dim">{s.id}</p>
                  </div>
                  <Badge size="xs" tone="bone" className="ml-auto">configure</Badge>
                </div>
                <p className="text-[12px] text-bone-muted leading-relaxed">{s.blurb}</p>
              </PlateBody>
            </Plate>
          );
        })}
      </div>

      {/* api keys — empty state */}
      <Plate className="fade-up" style={{ ["--d" as never]: "200ms" }}>
        <PlateHeader>
          <PlateTitle label="Service tokens" subtle="0 active" />
          <Button size="sm" variant="ember">Issue token</Button>
        </PlateHeader>
        <PlateBody>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[13px] text-bone-muted mb-4">No service tokens yet. Issue a token to authenticate CI pipelines and integrations.</p>
            <Button size="md" variant="outline">Issue first token</Button>
          </div>
        </PlateBody>
      </Plate>
    </div>
  );
}
