"use client";

import {
  useActionState,
  useId,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Button } from "@pigxel/ui/components/button";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import { Text } from "@pigxel/ui/components/typography";
import { Input, Textarea } from "@pigxel/ui/components/input";
import {
  giftBadge,
  saveHiringProfile,
  addPortfolioItem,
  editPortfolioItem,
} from "../actions";
import type { BadgeArt, HiringProfile, PortfolioItem } from "../server";
import type { PerkState } from "../validation";

function Result({ state }: { state: PerkState }) {
  return state.error ? (
    <FormMessage tone="error">{state.error}</FormMessage>
  ) : state.message ? (
    <FormMessage tone="success" role="status">
      {state.message}
    </FormMessage>
  ) : null;
}

function ArtSelect({
  arts,
  id,
  optional = false,
  selected = "",
}: {
  arts: BadgeArt[];
  id: string;
  optional?: boolean;
  selected?: string;
}) {
  return (
    <Field
      htmlFor={id}
      label={optional ? "Artwork preview (optional)" : "Badge artwork"}
      hint="Choose one of your published artworks."
    >
      <select
        id={id}
        name="tileId"
        required={!optional}
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
        defaultValue={selected}
      >
        <option value="">{optional ? "No preview" : "Choose artwork…"}</option>
        {selected && !arts.some((art) => art.id === selected) && (
          <option value={selected}>
            Current preview (no longer published)
          </option>
        )}
        {arts.map((art) => (
          <option key={art.id} value={art.id}>
            {art.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function GiftBadgeForm({
  arts,
  recipient,
}: {
  arts: BadgeArt[];
  recipient?: string;
}) {
  const [state, action, pending] = useActionState(giftBadge, {} as PerkState);
  return (
    <form action={action} className="mt-4 space-y-4">
      <Field label="Recipient’s username" htmlFor="gift-username">
        <Input
          id="gift-username"
          name="username"
          placeholder="artist_username"
          maxLength={21}
          defaultValue={recipient}
          required
        />
      </Field>
      <ArtSelect arts={arts} id="gift-art" />
      <Field label="Badge name" htmlFor="gift-label">
        <Input
          id="gift-label"
          name="label"
          maxLength={32}
          placeholder="Pixel superstar"
          required
        />
      </Field>
      <Field label="Message (optional)" htmlFor="gift-message">
        <Textarea
          id="gift-message"
          name="message"
          maxLength={200}
          placeholder="Tell them why you’re sending this badge."
        />
      </Field>
      <Result state={state} />
      <Button type="submit" disabled={pending || arts.length === 0}>
        {pending ? "Sending…" : "Send badge"}
      </Button>
      {!arts.length && (
        <FormMessage>
          Publish an artwork to Explore first so you can use it as your custom
          badge.
        </FormMessage>
      )}
    </form>
  );
}

export function HiringProfileForm({
  profile,
}: {
  profile: HiringProfile | null;
}) {
  const [state, action, pending] = useActionState(
    saveHiringProfile,
    {} as PerkState,
  );
  return (
    <form action={action} className="mt-4 space-y-4">
      <Field label="Headline" htmlFor="hiring-headline">
        <Input
          id="hiring-headline"
          name="headline"
          defaultValue={profile?.headline}
          placeholder="Pixel artist for games and commissions"
          maxLength={80}
          required
        />
      </Field>
      <Field label="About your work" htmlFor="hiring-description">
        <Textarea
          id="hiring-description"
          name="description"
          defaultValue={profile?.description}
          maxLength={1000}
        />
      </Field>
      <Field
        label="Contact link"
        htmlFor="hiring-contact"
        hint="A website or contact page where clients can reach you."
      >
        <Input
          id="hiring-contact"
          name="contactUrl"
          defaultValue={profile?.contact_url}
          placeholder="https://your-site.com/contact"
          maxLength={200}
          required
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="available"
          defaultChecked={profile?.available}
          className="size-4 accent-primary"
        />
        Available for commissions
      </label>
      <Result state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save hiring profile"}
      </Button>
    </form>
  );
}

export function PortfolioItemForm({
  arts,
  item,
}: {
  arts: BadgeArt[];
  item?: PortfolioItem;
}) {
  const prefix = useId();
  const [state, action, pending] = useActionState(
    item ? editPortfolioItem.bind(null, item.id) : addPortfolioItem,
    {} as PerkState,
  );
  return (
    <form action={action} className="mt-4 space-y-4">
      <Field label="Project title" htmlFor={`${prefix}-title`}>
        <Input
          id={`${prefix}-title`}
          name="title"
          defaultValue={item?.title}
          maxLength={80}
          required
        />
      </Field>
      <Field label="Description (optional)" htmlFor={`${prefix}-description`}>
        <Textarea
          id={`${prefix}-description`}
          name="description"
          defaultValue={item?.description}
          maxLength={300}
        />
      </Field>
      <Field label="Project link" htmlFor={`${prefix}-url`}>
        <Input
          id={`${prefix}-url`}
          name="url"
          defaultValue={item?.url}
          maxLength={200}
          placeholder="https://your-site.com/project"
          required
        />
      </Field>
      <ArtSelect
        arts={arts}
        id={`${prefix}-art`}
        optional
        selected={item?.tile_id ?? ""}
      />
      <Result state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : item ? "Save changes" : "Add portfolio item"}
      </Button>
    </form>
  );
}

export function PerkActionButton({
  action,
  children,
  destructive = false,
  confirmMessage,
  disabled = false,
}: {
  action: () => Promise<PerkState>;
  children: ReactNode;
  destructive?: boolean;
  confirmMessage?: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  return (
    <div>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending || disabled}
        className={destructive ? "text-destructive" : undefined}
        onClick={() => {
          if (confirmMessage && !confirming) {
            setConfirming(true);
            return;
          }
          startTransition(async () => {
            setError(null);
            try {
              const result = await action();
              if (result.error) setError(result.error);
              else setConfirming(false);
            } catch {
              setError("Couldn’t complete this action. Please try again.");
            }
          });
        }}
      >
        {pending ? "Saving…" : confirming ? "Confirm removal" : children}
      </Button>
      {confirming && (
        <div className="mt-2 max-w-xs space-y-2">
          <Text size="sm" tone="muted">
            {confirmMessage}
          </Text>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      )}
      {error && (
        <FormMessage tone="error" className="mt-2">
          {error}
        </FormMessage>
      )}
    </div>
  );
}
