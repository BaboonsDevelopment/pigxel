"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { changePlan, previewPlanChange, type PlanPreview } from "../actions";
import { planOfProduct } from "../subscription";

/** "Pro, billed yearly". */
const labelOf = (productId: string) => {
  const plan = planOfProduct(productId);
  if (!plan) return "";
  return `${plan.name}, ${plan.cycle === "month" ? "billed monthly" : "billed yearly"}`;
};

/**
 * Confirms a subscriber's switch to a plan picked on the Pricing page, in
 * place. The card on file is charged; no new checkout, which would start a
 * second subscription.
 */
export function ChangePlanDialog({
  productId,
  onClose,
}: {
  productId: string;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <ChangePlan productId={productId} />
    </Dialog>
  );
}

function ChangePlan({ productId }: { productId: string }) {
  const { close } = useDialog();
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    previewPlanChange(productId).then(
      (result) => live && setPreview(result),
      () => live && setPreview({ error: "Couldn’t check this plan change." }),
    );
    return () => {
      live = false;
    };
  }, [productId]);

  const change = preview && "change" in preview ? preview.change : null;
  const label = labelOf(productId);
  const confirm = () =>
    startTransition(async () => {
      setError(null);
      const result = await changePlan(productId).catch(() => ({
        error: "Couldn’t change your plan. Please try again.",
      }));
      if (result?.error) setError(result.error);
      else setDone(true);
    });

  const body = done ? (
    change === "upgrade" ? (
      `You’re now on ${label}.`
    ) : (
      `Done. You’ll switch to ${label} when your plan renews.`
    )
  ) : !preview ? (
    "Checking your plan…"
  ) : "error" in preview ? (
    <>
      {preview.error} You can manage it in{" "}
      <Link href="/settings/subscription" className={textLinkClassName}>
        Subscription settings
      </Link>
      .
    </>
  ) : change === "upgrade" ? (
    `You’ll switch to ${label} now. The prorated difference for the rest of this period is charged today to the card on file.`
  ) : (
    `You’ll keep your current plan until it renews, then switch to ${label}. Nothing is charged now.`
  );

  return (
    <>
      <ModalHeader title={done ? "Plan changed" : `Switch to ${label}?`} />
      <DialogBody className="grid gap-3 py-5">
        <p className="text-sm text-muted-foreground">{body}</p>
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        {done || !change ? (
          <ModalButton onClick={close}>{done ? "Done" : "Close"}</ModalButton>
        ) : (
          <>
            <ModalButton variant="secondary" disabled={pending} onClick={close}>
              Cancel
            </ModalButton>
            <ModalButton disabled={pending} onClick={confirm}>
              {pending
                ? "Switching…"
                : change === "upgrade"
                  ? "Upgrade and pay"
                  : "Switch at renewal"}
            </ModalButton>
          </>
        )}
      </DialogFooter>
    </>
  );
}
