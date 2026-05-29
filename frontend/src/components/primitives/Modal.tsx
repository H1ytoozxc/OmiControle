"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "w-full max-w-[480px]",
            "bg-ink-50/95 backdrop-blur-md",
            "border border-white/[0.10] rounded-md shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2",
            "data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]",
            "duration-150",
            className
          )}
        >
          {/* header */}
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-white/[0.06]">
            <div>
              <Dialog.Title className="text-[14px] font-medium text-bone leading-tight">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-[12px] font-mono text-bone-muted mt-0.5">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                className="shrink-0 text-bone-dim hover:text-bone transition-colors mt-0.5"
                aria-label="Close"
              >
                <X className="w-4 h-4" strokeWidth={1.6} />
              </button>
            </Dialog.Close>
          </div>

          {/* body */}
          <div className="px-5 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
