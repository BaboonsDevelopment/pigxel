"use client";

import { useState } from "react";
import { Radio } from "@pigxel/ui/components/choice";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Textarea } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import {
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  type ReportReason,
} from "../../../constants";

const LABEL = "mb-2 block text-sm font-semibold";

export function ReportDialog({
  onReport,
  onClose,
}: {
  onReport: (reason: ReportReason, details: string) => Promise<string | null>;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <ReportForm onReport={onReport} />
    </Dialog>
  );
}

function ReportForm({
  onReport,
}: {
  onReport: (reason: ReportReason, details: string) => Promise<string | null>;
}) {
  const { close } = useDialog();
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    setError(null);
    const failed = await onReport(reason, details);
    setSending(false);
    if (failed) setError(failed);
    else close();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
      className="flex min-h-0 flex-col"
    >
      <ModalHeader title="Report Artwork" className="bg-error-soft" />
      <DialogBody className="grid gap-5 py-5">
        <p className="text-sm">
          Help keep Pigxel a kind and creative place. Why are you reporting this
          artwork?
        </p>
        <fieldset>
          <legend className={LABEL}>Reason</legend>
          <div className="grid gap-2">
            {REPORT_REASONS.map(({ value, label }) => (
              <label
                key={value}
                className={cn(
                  "flex h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm transition-colors",
                  reason === value
                    ? "border-primary-soft bg-pastel-pink-soft"
                    : "bg-background hover:bg-pink-base",
                )}
              >
                <Radio
                  name="report-reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className="mt-0"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className={LABEL}>Details (optional)</span>
          <Textarea
            rows={3}
            maxLength={REPORT_DETAILS_MAX}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="This artwork appears to be repeated promotional content."
            className="rounded-xl px-4 py-3"
          />
        </label>
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={sending}>
          {sending ? "Sending…" : "Submit Report"}
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
