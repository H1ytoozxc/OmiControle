"use client";

import * as React from "react";
import Link from "next/link";
import { Filter, Search, Plus } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge,
} from "@/components/primitives";

export default function DevicesPage() {
  const [search, setSearch] = React.useState("");

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 fade-up">
        <div>
          <p className="eyebrow mb-2">/ devices</p>
          <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">Fleet</h1>
          <p className="text-[12.5px] text-bone-muted mt-1">No devices enrolled yet.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-[260px] flex items-center gap-2 px-2.5 bg-ink-100/50 border border-white/[0.06] rounded-sm">
            <Search className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, id, region…"
              className="flex-1 bg-transparent outline-none text-[12.5px] text-bone placeholder:text-bone-dim"
            />
          </div>
          <Button variant="outline" size="md">
            <Filter className="w-3.5 h-3.5" strokeWidth={1.6} />Filter
          </Button>
          <Button variant="ember" size="md">
            <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />Enroll
          </Button>
        </div>
      </header>

      <Plate className="fade-up" style={{ ["--d" as never]: "80ms" }}>
        <PlateHeader>
          <PlateTitle label="Devices" subtle="0 enrolled" />
          <div className="flex items-center gap-2">
            <Badge size="xs" tone="bone">all</Badge>
            {(["ok", "warn", "crit", "offline"] as const).map((s) => (
              <Badge key={s} size="xs" tone={s === "ok" ? "mint" : s === "warn" ? "ember" : s === "crit" ? "flame" : "bone"}>
                {s}
              </Badge>
            ))}
          </div>
        </PlateHeader>
        <PlateBody>
          {/* empty state */}
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-md bg-ink-100 border border-white/[0.08] grid place-items-center mb-4">
              <Plus className="w-5 h-5 text-bone-dim" strokeWidth={1.4} />
            </div>
            <p className="text-[14px] text-bone mb-1">No devices enrolled</p>
            <p className="text-[12.5px] text-bone-muted max-w-[320px] leading-relaxed mb-5">
              Install the Sequoia agent on any Linux, Windows, or macOS host to start monitoring.
            </p>
            <div className="flex gap-2">
              <Button variant="ember" size="md">
                <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />Enroll first device
              </Button>
              <Button variant="outline" size="md" asChild>
                <Link href="#">View docs</Link>
              </Button>
            </div>
          </div>
        </PlateBody>
      </Plate>
    </div>
  );
}
