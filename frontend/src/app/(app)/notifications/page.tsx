import { Bell } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button,
} from "@/components/primitives";

export default function NotificationsPage() {
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 fade-up">
        <div>
          <p className="eyebrow mb-2">/ notifications</p>
          <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">Inbox</h1>
          <p className="text-[12.5px] text-bone-muted mt-1">Alerts and system notifications appear here.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Channels</Button>
          <Button variant="outline">Templates</Button>
        </div>
      </header>

      <Plate className="fade-up" style={{ ["--d" as never]: "80ms" }}>
        <PlateHeader>
          <PlateTitle label="Alerts" subtle="0 unread" />
        </PlateHeader>
        <PlateBody>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-md bg-ink-100 border border-white/[0.08] grid place-items-center mb-4">
              <Bell className="w-5 h-5 text-bone-dim" strokeWidth={1.4} />
            </div>
            <p className="text-[14px] text-bone mb-1">No notifications</p>
            <p className="text-[12.5px] text-bone-muted max-w-[300px] leading-relaxed">
              Alerts from your devices, workflows, and agents will appear here.
            </p>
          </div>
        </PlateBody>
      </Plate>
    </div>
  );
}
