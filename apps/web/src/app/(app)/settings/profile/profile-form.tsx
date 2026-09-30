"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import {
  Input,
  InputGroup,
  InputGroupInput,
  InputGroupText,
  Textarea,
} from "@pigxel/ui/components/input";
import type { ArtistProfile } from "@/lib/profile/profile";
import {
  BIO_MAX,
  LINK_LABEL_MAX,
  MAX_LINKS,
  NAME_MAX,
  USERNAME_MAX,
  normalizeUsername,
} from "@/lib/profile/validation";
import { checkUsername, updateProfile, type ProfileFormState } from "./actions";

type Availability = { username: string; available: boolean; error?: string };

export function ProfileForm({ profile }: { profile: ArtistProfile }) {
  const [state, action, pending] = useActionState(
    updateProfile,
    {} as ProfileFormState,
  );
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const wanted = normalizeUsername(username);
  const changed = wanted !== profile.username;

  // Checks a new username once typing pauses.
  useEffect(() => {
    if (!changed) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const result = await checkUsername(wanted);
      if (!stale) setAvailability({ username: wanted, ...result });
    }, 400);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [wanted, changed]);

  const check =
    changed && availability?.username === wanted ? availability : null;
  const errorFor = (name: ProfileFormState["field"]) =>
    state.field === name ? state.error : undefined;
  const links = Array.from(
    { length: MAX_LINKS },
    (_, i) => profile.links[i] ?? { url: "" },
  );

  return (
    <form action={action} className="mt-5 space-y-6">
      <Field label="Display name" htmlFor="name" error={errorFor("name")}>
        <Input
          id="name"
          name="name"
          required
          maxLength={NAME_MAX}
          defaultValue={profile.name}
        />
      </Field>

      <Field
        label="Username"
        htmlFor="username"
        error={
          errorFor("username") ?? (check?.available ? undefined : check?.error)
        }
        hint={
          check?.available
            ? `@${wanted} is available.`
            : `Your profile’s address: /u/${wanted || "…"}`
        }
      >
        <InputGroup>
          <InputGroupText className="pr-0">@</InputGroupText>
          <InputGroupInput
            id="username"
            name="username"
            required
            maxLength={USERNAME_MAX + 1}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="pl-1"
          />
        </InputGroup>
      </Field>

      <Field
        label="Description"
        htmlFor="bio"
        error={errorFor("bio")}
        hint={`${bio.length}/${BIO_MAX}`}
      >
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={BIO_MAX}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="What do you like to draw?"
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium">Links</legend>
        <FormMessage className="mt-1 text-xs">
          Up to {MAX_LINKS}: your website, Pinterest, ArtStation, Instagram…
        </FormMessage>
        <div className="mt-3 space-y-2">
          {links.map((link, i) => (
            <div
              key={i}
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2"
            >
              <Input
                name="linkUrl"
                aria-label={`Link ${i + 1} address`}
                inputMode="url"
                placeholder="pinterest.com/you"
                defaultValue={link.url}
              />
              <Input
                name="linkLabel"
                aria-label={`Link ${i + 1} name`}
                maxLength={LINK_LABEL_MAX}
                placeholder="Name (optional)"
                defaultValue={link.label ?? ""}
              />
            </div>
          ))}
        </div>
        {errorFor("links") && (
          <FormMessage tone="error" className="mt-2">
            {errorFor("links")}
          </FormMessage>
        )}
      </fieldset>

      <div className="flex items-center gap-4">
        {/* A username already known to be taken or invalid can't be saved. */}
        <Button disabled={pending || check?.available === false}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        {state.error && !state.field ? (
          <FormMessage tone="error">{state.error}</FormMessage>
        ) : (
          <FormMessage role="status" tone="success">
            {state.message}
          </FormMessage>
        )}
      </div>
    </form>
  );
}
