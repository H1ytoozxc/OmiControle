"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button,
} from "@/components/primitives";
import { useT } from "@/lib/i18n";

export default function WorkflowsPage() {
  const t = useT().workflows;
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-6 fade-up">
        <div>
          <p className="eyebrow mb-2">/ workflows</p>
          <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">{t.title}</h1>
          <p className="text-[12.5px] text-bone-muted mt-1">{t.emptyNote}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ember" asChild>
            <Link href="/workflows/builder/new">
              <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />{t.create}
            </Link>
          </Button>
        </div>
      </header>

      <Plate className="fade-up" style={{ ["--d" as never]: "80ms" }}>
        <PlateHeader>
          <PlateTitle label={t.eyebrow} subtle="0" />
        </PlateHeader>
        <PlateBody>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-md bg-ink-100 border border-white/[0.08] grid place-items-center mb-4">
              <Plus className="w-5 h-5 text-bone-dim" strokeWidth={1.4} />
            </div>
            <p className="text-[14px] text-bone mb-1">{t.empty}</p>
            <p className="text-[12.5px] text-bone-muted max-w-[320px] leading-relaxed mb-5">{t.emptyNote}</p>
            <Button variant="ember" size="md" asChild>
              <Link href="/workflows/builder/new">
                <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />{t.create}
              </Link>
            </Button>
          </div>
        </PlateBody>
      </Plate>
    </div>
  );
}
