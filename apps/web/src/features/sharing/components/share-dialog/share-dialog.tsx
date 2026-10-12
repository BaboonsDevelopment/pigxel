"use client";

import { Button } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";
import { cn } from "@pigxel/ui/lib/utils";
import { FormMessage } from "@pigxel/ui/components/field";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { useProjectSharing } from "../../queries";
import { InviteForm } from "./components/invite-form";
import { LinkAccessSection } from "./components/link-access-section";
import { PersonRow } from "./components/person-row";
import { ShareBadge } from "./components/share-badge";
import { ACTION_WIDTH, PILL_WIDTH, ROW, SECTION_TITLE } from "./constants";

export function ShareDialog({
  tile,
  onClose,
}: {
  tile: { id: string; name: string };
  onClose: () => void;
}) {
  const share = useProjectSharing(tile.id);

  const shared =
    !!share.sharing &&
    (share.sharing.people.length > 0 || share.sharing.link.access !== "off");

  const stop = async () => {
    const confirmed = await confirmDialog({
      title: `Stop sharing “${tile.name}”?`,
      message:
        "Everyone loses access, open invitations are cancelled and the link stops working. The project stays yours.",
      confirmLabel: "Stop sharing",
    });
    if (confirmed) share.stopSharing();
  };

  return (
    <Dialog onClose={onClose} size="md" portal>
      <DialogHeader title={`Share “${tile.name}”`} />
      <DialogBody className="grid grid-cols-1 gap-5">
        <InviteForm
          people={share.sharing?.people ?? []}
          inviting={share.inviting}
          onInvite={share.invite}
        />

        <section aria-labelledby="share-people">
          <h3 id="share-people" className={SECTION_TITLE}>
            People with access
          </h3>
          <ul className="-mx-2 grid gap-0.5">
            <li className={ROW}>
              <ProfileAvatar name="You" url={null} className="size-8 text-xs" />
              <span className="ml-1 flex min-w-0 flex-1 items-center gap-2">
                <span className="text-sm font-medium">You</span>
                <ShareBadge tone="owner">Owner</ShareBadge>
              </span>
              <span
                className={cn(
                  PILL_WIDTH,
                  "shrink-0 px-3 text-xs text-muted-foreground",
                )}
              >
                Full access
              </span>
              <span aria-hidden="true" className={ACTION_WIDTH} />
            </li>
            {share.loading && (
              <li className="mx-2 h-12 animate-pulse rounded-lg bg-muted" />
            )}
            {share.sharing?.people.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                onRoleChange={(value) => share.setRole(person.id, value)}
                onRemove={() => share.remove(person.id)}
              />
            ))}
          </ul>
        </section>

        {share.sharing && (
          <LinkAccessSection
            link={share.sharing.link}
            resetting={share.resetting}
            onAccessChange={share.setLink}
            onReset={share.resetLink}
          />
        )}

        {(share.error ?? share.loadError) && (
          <FormMessage tone="error">
            {share.error ?? share.loadError}
          </FormMessage>
        )}
      </DialogBody>
      <DialogFooter className="items-center">
        {shared && (
          <button
            type="button"
            onClick={() => void stop()}
            className="mr-auto cursor-pointer text-xs text-destructive transition-colors hover:underline"
          >
            Stop sharing
          </button>
        )}
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
