import { Plus } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button,
} from "@/components/primitives";

export default function AiPage() {
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-6 fade-up">
        <div>
          <p className="eyebrow mb-2">/ ai</p>
          <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">AI agents</h1>
          <p className="text-[12.5px] text-bone-muted mt-1">Deploy autonomous agents to monitor and respond to fleet events.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Playground</Button>
          <Button variant="ember">
            <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />New agent
          </Button>
        </div>
      </header>

      <Plate className="fade-up" style={{ ["--d" as never]: "80ms" }}>
        <PlateHeader>
          <PlateTitle label="Agents" subtle="0 configured" />
        </PlateHeader>
        <PlateBody>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-md bg-ink-100 border border-white/[0.08] grid place-items-center mb-4">
              <Plus className="w-5 h-5 text-bone-dim" strokeWidth={1.4} />
            </div>
            <p className="text-[14px] text-bone mb-1">No agents configured</p>
            <p className="text-[12.5px] text-bone-muted max-w-[340px] leading-relaxed mb-5">
              Agents use Claude to classify anomalies, rotate credentials, and orchestrate incident response automatically.
            </p>
            <Button variant="ember" size="md">
              <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />Create first agent
            </Button>
          </div>
        </PlateBody>
      </Plate>
    </div>
  );
}
