"use client";

import * as React from "react";
import { Key, Plug, Server, Network, GitBranch, Boxes, Copy, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge, Modal,
} from "@/components/primitives";
import { api } from "@/lib/api/client";

interface ServiceToken {
  token_id: string;
  name: string;
  prefix: string;
  created_at?: string;
  last_used_at?: string;
}

interface ServiceTokensResp { items: ServiceToken[] }
interface ServiceTokenCreated {
  token_id: string;
  name: string;
  prefix: string;
  token: string;
  created_at?: string;
}

const SECTIONS = [
  { id: "api-keys",      label: "API keys",        icon: Key,       blurb: "Personal access tokens and service credentials." },
  { id: "integrations",  label: "Integrations",    icon: Plug,      blurb: "OIDC providers, SMTP, FCM, webhook receivers.", soon: true },
  { id: "plugins",       label: "Plugin registry", icon: Boxes,     blurb: "Signed WASM bundles and capability allow-lists.", soon: true },
  { id: "network",       label: "Network",         icon: Network,   blurb: "Internal mTLS, ingress, allowed device origins.", soon: true },
  { id: "infra",         label: "Infrastructure",  icon: Server,    blurb: "Postgres, Redis, object storage endpoints." },
  { id: "deploy",        label: "Deployments",     icon: GitBranch, blurb: "GitOps cadence, canary policies.", soon: true },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tokenModal, setTokenModal] = React.useState(false);
  const [tokenName, setTokenName] = React.useState("");
  const [issuedToken, setIssuedToken] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const tokensQuery = useQuery<ServiceTokensResp>({
    queryKey: ["service-tokens"],
    queryFn: () => api<ServiceTokensResp>("/v1/tokens"),
  });

  const createMutation = useMutation<ServiceTokenCreated, Error, string>({
    mutationFn: (name) => api<ServiceTokenCreated>("/v1/tokens", { method: "POST", body: { name } }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["service-tokens"] });
      setIssuedToken(data.token);
      toast.success("Token issued — copy it now, it won't be shown again");
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeMutation = useMutation<void, Error, string>({
    mutationFn: (id) => api(`/v1/tokens/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-tokens"] });
      toast.success("Token revoked");
    },
    onError: (err) => toast.error(err.message),
  });

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else toast.info("Coming soon — this section is not yet implemented");
  }

  async function issueToken(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenName.trim()) { toast.error("Enter a token name"); return; }
    createMutation.mutate(tokenName.trim());
  }

  function copyToken() {
    if (!issuedToken) return;
    navigator.clipboard.writeText(issuedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closeTokenModal() {
    setTokenModal(false);
    setTokenName("");
    setIssuedToken(null);
  }

  const tokens = tokensQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <header className="fade-up">
        <p className="eyebrow mb-2">/ settings</p>
        <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">Configuration</h1>
        <p className="text-[12.5px] text-bone-muted mt-1">Manage your organization settings and integrations.</p>
      </header>

      {/* Section navigation cards */}
      <div className="grid grid-cols-12 gap-4 fade-up" style={{ ["--d" as never]: "80ms" }}>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className="col-span-4 text-left group"
            >
              <Plate className="h-full group-hover:border-white/[0.14] transition-colors">
                <PlateBody className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-md bg-ink-100 border border-white/[0.08] grid place-items-center group-hover:border-ember/30 transition-colors shrink-0">
                      <Icon className="w-4 h-4 text-bone-muted group-hover:text-ember transition-colors" strokeWidth={1.6} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] text-bone group-hover:text-ember transition-colors truncate">{s.label}</p>
                      <p className="text-[10.5px] font-mono text-bone-dim">{s.id}</p>
                    </div>
                    {s.soon
                      ? <Badge size="xs" tone="bone" className="ml-auto shrink-0">soon</Badge>
                      : <Badge size="xs" tone="ember" className="ml-auto shrink-0">configure</Badge>
                    }
                  </div>
                  <p className="text-[12px] text-bone-muted leading-relaxed">{s.blurb}</p>
                </PlateBody>
              </Plate>
            </button>
          );
        })}
      </div>

      {/* API keys section */}
      <Plate id="api-keys" className="fade-up" style={{ ["--d" as never]: "160ms" }}>
        <PlateHeader>
          <PlateTitle
            label="Service tokens"
            subtle={tokens.length > 0 ? `${tokens.length} active` : "0 active"}
          />
          <Button size="sm" variant="ember" onClick={() => setTokenModal(true)}>
            <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />Issue token
          </Button>
        </PlateHeader>
        <PlateBody>
          {tokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-[13px] text-bone-muted mb-4">
                No service tokens yet. Issue a token to authenticate CI pipelines and integrations.
              </p>
              <Button size="md" variant="outline" onClick={() => setTokenModal(true)}>
                <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />Issue first token
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {tokens.map((tok) => (
                <div key={tok.token_id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-bone truncate">{tok.name}</p>
                    <p className="text-[11px] font-mono text-bone-dim mt-0.5">
                      {tok.prefix}… · created {tok.created_at ? new Date(tok.created_at).toLocaleDateString() : "—"}
                      {tok.last_used_at && ` · last used ${new Date(tok.last_used_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeMutation.mutate(tok.token_id)}
                    disabled={revokeMutation.isPending}
                    className="shrink-0 text-flame/60 hover:text-flame transition-colors"
                    aria-label="Revoke token"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </PlateBody>
      </Plate>

      {/* Infrastructure info section */}
      <Plate id="infra" className="fade-up" style={{ ["--d" as never]: "220ms" }}>
        <PlateHeader>
          <PlateTitle label="Infrastructure" />
          <Badge size="xs" tone="mint">connected</Badge>
        </PlateHeader>
        <PlateBody className="space-y-3">
          {[
            { label: "Postgres", value: "postgres://sequoia:***@<db-host>:5432/sequoia" },
            { label: "Redis", value: "redis://<redis-host>:6379/0" },
            { label: "API Gateway", value: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080" },
            { label: "Realtime", value: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8083/ws" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 py-1.5 border-t border-white/[0.04] first:border-0">
              <span className="eyebrow w-28 shrink-0">{row.label}</span>
              <span className="font-mono text-[11.5px] text-bone-muted truncate">{row.value}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(row.value); toast.success("Copied"); }}
                className="shrink-0 text-bone-dim hover:text-bone transition-colors"
                aria-label="Copy"
              >
                <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
              </button>
            </div>
          ))}
        </PlateBody>
      </Plate>

      {/* Coming soon sections */}
      {(["integrations", "plugins", "network", "deploy"] as const).map((id, i) => {
        const sec = SECTIONS.find((s) => s.id === id)!;
        const Icon = sec.icon;
        return (
          <Plate
            key={id}
            id={id}
            className="fade-up"
            style={{ ["--d" as never]: `${280 + i * 60}ms` }}
          >
            <PlateHeader>
              <PlateTitle label={sec.label} />
              <Badge size="xs" tone="bone">coming soon</Badge>
            </PlateHeader>
            <PlateBody>
              <div className="flex items-center gap-4 py-6 text-bone-dim">
                <Icon className="w-8 h-8 shrink-0" strokeWidth={1.2} />
                <div>
                  <p className="text-[13px] text-bone-muted">{sec.blurb}</p>
                  <p className="text-[11.5px] font-mono text-bone-dim mt-1">This section is planned for a future release.</p>
                </div>
              </div>
            </PlateBody>
          </Plate>
        );
      })}

      {/* Issue token modal */}
      <Modal
        open={tokenModal}
        onClose={closeTokenModal}
        title="Issue service token"
        description="Tokens are used to authenticate CI pipelines and integrations."
      >
        {issuedToken ? (
          <div className="space-y-4">
            <p className="text-[12.5px] text-bone-muted">
              Copy your token now — it will not be shown again.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-sm bg-ink border border-white/[0.08] font-mono text-[11.5px] text-bone">
              <span className="flex-1 truncate select-all">{issuedToken}</span>
              <button
                onClick={copyToken}
                className="shrink-0 text-bone-dim hover:text-bone transition-colors"
                aria-label="Copy token"
              >
                {copied ? <Check className="w-4 h-4 text-mint" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <Button variant="ember" size="md" className="w-full" onClick={closeTokenModal}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={issueToken} className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Token name</span>
              <input
                autoFocus
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="ci-deploy, grafana-reader, …"
                className="field-input"
              />
              <span className="text-[11px] font-mono text-bone-dim">
                A descriptive name to identify this token.
              </span>
            </label>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" size="sm" onClick={closeTokenModal}>Cancel</Button>
              <Button type="submit" variant="ember" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Issuing…" : "Issue token"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
