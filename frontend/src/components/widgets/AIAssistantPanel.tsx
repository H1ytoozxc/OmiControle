"use client";

import * as React from "react";
import { Sparkles, ArrowUp } from "lucide-react";
import { Plate, PlateHeader, PlateTitle, PlateBody, Button, Badge } from "@/components/primitives";

export function AIAssistantPanel() {
  const [input, setInput] = React.useState("");

  return (
    <Plate className="flex flex-col h-full">
      <PlateHeader>
        <PlateTitle label="AI Copilot" />
        <Badge tone="bone" size="xs"><Sparkles className="w-2.5 h-2.5" />Opus 4.7</Badge>
      </PlateHeader>

      <PlateBody className="flex-1 flex flex-col gap-3">
        {/* empty state */}
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-full bg-ink-100 border border-white/[0.08] grid place-items-center mb-3">
            <Sparkles className="w-4 h-4 text-bone-dim" strokeWidth={1.4} />
          </div>
          <p className="text-[13px] text-bone mb-1">Ask anything about your fleet</p>
          <p className="text-[11.5px] text-bone-muted max-w-[220px] leading-relaxed">
            Enroll devices first — then the copilot will have context to work with.
          </p>
        </div>

        {/* compose */}
        <div className="border-t border-white/[0.06] pt-3">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Sequoia anything…"
              className="flex-1 h-8 bg-ink-50/60 border border-white/[0.08] focus:border-ember/40 rounded-sm px-3 text-[12.5px] text-bone placeholder:text-bone-dim outline-none transition-colors"
            />
            <Button size="icon" variant="ember" type="submit" aria-label="Send">
              <ArrowUp className="w-3.5 h-3.5" strokeWidth={1.8} />
            </Button>
          </form>
        </div>
      </PlateBody>
    </Plate>
  );
}
