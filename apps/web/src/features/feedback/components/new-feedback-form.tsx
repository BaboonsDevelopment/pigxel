"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import { cardVariants } from "@pigxel/ui/components/card";
import { ChoiceCard, ChoiceText, Radio } from "@pigxel/ui/components/choice";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import { Input, Textarea } from "@pigxel/ui/components/input";
import {
  DESCRIPTION_MAX,
  FEEDBACK_KINDS,
  OPEN_LIMIT,
  TITLE_MAX,
  type FeedbackKind,
} from "../feedback";
import { createFeedback, type FeedbackFormState } from "../actions";

const KIND_TEXT: Record<
  FeedbackKind,
  { description: string; title: string; details: string; send: string }
> = {
  bug: {
    description: "Something broke, looks wrong or didn’t do what you expected.",
    title: "The bucket fills the whole tile",
    details:
      "What happened, what you expected, and how to make it happen again.",
    send: "Send bug report",
  },
  feature: {
    description: "Something you’d like Pigxel to do, or to do better.",
    title: "Export a GIF with a transparent background",
    details: "What you’d like to do, and why it would help.",
    send: "Send request",
  },
};

export function NewFeedbackForm({
  initialKind,
  open,
  page,
}: {
  initialKind: FeedbackKind;
  open: Record<FeedbackKind, number>;
  page: string | null;
}) {
  const [state, action, pending] = useActionState(
    createFeedback,
    {} as FeedbackFormState,
  );
  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const text = KIND_TEXT[kind];
  const full = open[kind] >= OPEN_LIMIT;
  const errorFor = (name: FeedbackFormState["field"]) =>
    state.field === name ? state.error : undefined;

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="sr-only">What are you sending?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["bug", "feature"] as const).map((value) => (
            <ChoiceCard key={value}>
              <Radio
                name="kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
              />
              <ChoiceText title={FEEDBACK_KINDS[value].new}>
                {KIND_TEXT[value].description}
                <span className="mt-1 block text-xs tabular-nums">
                  {open[value]} of {OPEN_LIMIT} open
                </span>
              </ChoiceText>
            </ChoiceCard>
          ))}
        </div>
        {errorFor("kind") && (
          <FormMessage tone="error" className="mt-2">
            {errorFor("kind")}
          </FormMessage>
        )}
      </fieldset>

      {full ? (
        <div
          className={cardVariants({
            tone: "muted",
            padding: "sm",
            className: "text-sm",
          })}
        >
          <p>
            You have {OPEN_LIMIT} open {FEEDBACK_KINDS[kind].one}s waiting for
            the team. Once one of them is approved, declined or closed, you can
            send another. Meanwhile, you can vote for other people’s.
          </p>
          <Link
            href={`/feedback?kind=${kind}`}
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              className: "mt-3",
            })}
          >
            See the {FEEDBACK_KINDS[kind].label.toLowerCase()}
          </Link>
        </div>
      ) : (
        <>
          <Field
            label="Title"
            htmlFor="title"
            error={errorFor("title")}
            hint={`${title.length}/${TITLE_MAX}`}
          >
            <Input
              id="title"
              name="title"
              required
              maxLength={TITLE_MAX}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={text.title}
            />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            error={errorFor("description")}
            hint={`${description.length}/${DESCRIPTION_MAX} · ${text.details}`}
          >
            <Textarea
              id="description"
              name="description"
              required
              rows={4}
              maxLength={DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {page && <input type="hidden" name="page" value={page} />}

          <div className="flex flex-wrap items-center gap-4">
            <Button disabled={pending}>
              {pending ? "Sending…" : text.send}
            </Button>
            {state.error && !state.field && (
              <FormMessage tone="error">{state.error}</FormMessage>
            )}
          </div>
          <FormMessage className="text-xs">
            Everyone signed in can see it on the board. Your browser and the
            Pigxel version go along to help the team; only they see those.
          </FormMessage>
        </>
      )}
    </form>
  );
}
