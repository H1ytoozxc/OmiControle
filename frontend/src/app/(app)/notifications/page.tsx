"use client";

import { Bell, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Badge,
} from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api/client";

interface Channel {
  id: string;
  kind: string;
  enabled: boolean;
}

interface ChannelListResp {
  items: Channel[];
  next_cursor?: string;
}

export default function NotificationsPage() {
  const t = useT().notifications;

  const channelsQuery = useQuery<ChannelListResp>({
    queryKey: ["notification-channels"],
    queryFn: () => api<ChannelListResp>("/v1/notifications/channels"),
    retry: false,
  });

  const channels = channelsQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 fade-up">
        <div>
          <p className="eyebrow mb-2">/ notifications</p>
          <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">{t.title}</h1>
          <p className="text-[12.5px] text-bone-muted mt-1">{t.emptyNote}</p>
        </div>
      </header>

      <Plate className="fade-up" style={{ ["--d" as never]: "80ms" }}>
        <PlateHeader>
          <PlateTitle
            label={t.eyebrow}
            subtle={channelsQuery.isLoading ? "…" : String(channels.length)}
          />
          {channelsQuery.isError && (
            <Badge size="xs" tone="bone">service unavailable</Badge>
          )}
        </PlateHeader>
        <PlateBody>
          {channelsQuery.isLoading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-bone-muted text-[13px]">
              <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.6} />
              Loading channels…
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-md bg-ink-100 border border-white/[0.08] grid place-items-center mb-4">
                <Bell className="w-5 h-5 text-bone-dim" strokeWidth={1.4} />
              </div>
              <p className="text-[14px] text-bone mb-1">{t.empty}</p>
              <p className="text-[12.5px] text-bone-muted max-w-[300px] leading-relaxed">{t.emptyNote}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {channels.map((ch) => (
                <div key={ch.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <Bell className="w-4 h-4 text-bone-dim shrink-0" strokeWidth={1.6} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-bone truncate">{ch.kind}</p>
                    <p className="text-[11px] font-mono text-bone-dim mt-0.5">{ch.id}</p>
                  </div>
                  <Badge size="xs" tone={ch.enabled ? "mint" : "bone"}>
                    {ch.enabled ? "active" : "disabled"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </PlateBody>
      </Plate>
    </div>
  );
}
