"use client";

import Link from "next/link";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton, modalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { PremiumBadge } from "./premium-badge";
import styles from "./premium.module.css";

/** Shown instead of a paid feature to people on the Free plan. */
export function UpgradeDialog({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <Upgrade title={title} description={description} />
    </Dialog>
  );
}

function Upgrade({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { close } = useDialog();
  return (
    <>
      <span aria-hidden="true" className={cn(styles.flow, "block h-1")} />
      <ModalHeader title={title} />
      <DialogBody className="grid justify-items-start gap-3 py-5">
        <PremiumBadge />
        <p className="text-sm text-muted-foreground">{description}</p>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Maybe later
        </ModalButton>
        <Link
          href="/pricing"
          className={modalButton(
            "primary",
            cn(styles.flow, "hover:opacity-90"),
          )}
        >
          Upgrade
        </Link>
      </DialogFooter>
    </>
  );
}
