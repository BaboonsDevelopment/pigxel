"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage, Label } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { Page } from "@pigxel/ui/components/page";
import { Heading } from "@pigxel/ui/components/typography";
import { enterReviewKey } from "../use-asset-review";

export function ReviewKeyForm() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await enterReviewKey(key);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPending(false);
    }
  };

  return (
    <Page width="narrow" className="grid min-h-[70vh] place-items-center">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-3 rounded-xl border bg-card p-6 shadow-[0_1px_2px_rgb(59_42_51/0.06)]"
      >
        <Heading as="h1" size="title">
          Asset review
        </Heading>
        <Label htmlFor="review-key">Review key</Label>
        <Input
          id="review-key"
          type="password"
          autoComplete="off"
          autoFocus
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <Button type="submit" disabled={!key || pending}>
          {pending ? "Checking…" : "Open"}
        </Button>
      </form>
    </Page>
  );
}
