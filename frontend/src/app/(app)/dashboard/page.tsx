"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Cpu, Bot, Workflow, Terminal, Plus, ArrowRight } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge, SignalDot,
} from "@/components/primitives";
import { ActivityFeed } from "@/components/widgets/ActivityFeed";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api/client";

interface OverviewStats {
  devices_total: number;
  devices_online: number;
  workflows_total: number;
}

export default function DashboardPage() {
  const t = useT().dashboard;
  const QUICK_ICONS = [Cpu, Workflow, Bot, Terminal];
  const QUICK_HREFS = ["/devices", "/workflows", "/ai", "#"];

  const stats = useQuery({
    queryKey: ["stats", "overview"],
    queryFn: () => api<OverviewStats>("/v1/stats/overview"),
    refetchInterval: 30_000,
    retry: false,
  });

  const kpiValues = [
    stats.data ? `${stats.data.devices_online}/${stats.data.devices_total}` : "—",
    "—",
    stats.data ? String(stats.data.workflows_total) : "—",
    "—",
  ];

  return (
    <div className="space-y-6">
      {/* header */}
      <section className="fade-up">
        <p className="eyebrow mb-3">{t.eyebrow}</p>
        <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">
          {t.title}
        </h1>
        <p className="text-[13.5px] text-bone-muted mt-1.5 max-w-[480px] leading-relaxed">
          {t.subtitle}
        </p>
        <div className="flex gap-2 mt-5">
          <Button variant="ember" size="lg" asChild>
            <Link href="/devices">
              <Plus className="w-4 h-4" strokeWidth={1.8} />{t.enrollDevice}
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/ai">
              <Bot className="w-4 h-4" strokeWidth={1.8} />{t.launchAgent}
            </Link>
          </Button>
        </div>
      </section>

      {/* kpi row */}
      <div className="grid grid-cols-4 gap-4 fade-up" style={{ ["--d" as never]: "60ms" }}>
        {t.kpis.map((s, i) => (
          <Plate key={s.label}>
            <PlateBody className="space-y-1">
              <p className="eyebrow">{s.label}</p>
              <p className="text-[28px] font-semibold text-bone leading-none tabular-nums">{kpiValues[i]}</p>
              <p className="text-[11px] font-mono text-bone-dim">{s.hint}</p>
            </PlateBody>
          </Plate>
        ))}
      </div>

      {/* main grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* activity */}
        <Plate className="col-span-8 fade-up" style={{ ["--d" as never]: "120ms" }}>
          <PlateHeader>
            <PlateTitle label={t.activityTitle} live ts="LIVE" />
          </PlateHeader>
          <PlateBody>
            <ActivityFeed />
          </PlateBody>
        </Plate>

        {/* quick actions */}
        <div className="col-span-4 flex flex-col gap-4 fade-up" style={{ ["--d" as never]: "160ms" }}>
          <Plate>
            <PlateHeader><PlateTitle label={t.quickStart} /></PlateHeader>
            <PlateBody className="space-y-2">
              {t.quickLinks.map((item, idx) => {
                const Icon = QUICK_ICONS[idx];
                return (
                  <a
                    key={item.label}
                    href={QUICK_HREFS[idx]}
                    className="flex items-center gap-3 p-2.5 rounded-sm border border-white/[0.06] bg-ink-50/40 hover:bg-ink-100/60 hover:border-white/[0.10] transition-colors group"
                  >
                    <span className="w-7 h-7 rounded-sm bg-ink-100 border border-white/[0.08] grid place-items-center group-hover:border-ember/30 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-bone-muted group-hover:text-ember transition-colors" strokeWidth={1.6} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] text-bone group-hover:text-ember transition-colors">{item.label}</p>
                      <p className="text-[10.5px] font-mono text-bone-dim truncate">{item.hint}</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-bone-dim opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.6} />
                  </a>
                );
              })}
            </PlateBody>
          </Plate>

          <Plate>
            <PlateHeader><PlateTitle label={t.systemStatus} /></PlateHeader>
            <PlateBody className="space-y-2">
              {t.systemRows.map((label) => (
                <div key={label} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2 text-bone-muted">
                    <SignalDot state="ok" />
                    {label}
                  </span>
                  <Badge size="xs" tone="mint">{t.operational}</Badge>
                </div>
              ))}
            </PlateBody>
          </Plate>
        </div>
      </div>
    </div>
  );
}
