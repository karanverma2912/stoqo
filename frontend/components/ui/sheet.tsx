"use client";
import { useLanguage } from "@/components/language-provider";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { tr } = useLanguage();
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="sheet-content">
          <div className="sheet-handle" />
          <div className="sheet-heading">
            <Dialog.Title>{tr(title)}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label={tr("Close")}>
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className={description ? "muted" : "sr-only"}>
            {tr(description || title)}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
