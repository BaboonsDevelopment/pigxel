import {
  normalizeUrl,
  normalizeUsername,
  usernameError,
} from "@/features/profile/validation";

export type PerkState = { error?: string; message?: string };
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const formText = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

export function readBadge(form: FormData) {
  const username = normalizeUsername(formText(form, "username"));
  const label = formText(form, "label");
  const message = formText(form, "message");
  const tileId = formText(form, "tileId");
  if (usernameError(username))
    return { error: "Enter the recipient’s Pigxel username." } as const;
  if (!label || label.length > 32 || message.length > 200 || !UUID.test(tileId))
    return {
      error:
        "Choose a published artwork, a badge name up to 32 characters, and a message up to 200 characters.",
    } as const;
  return { value: { username, label, message, tileId } } as const;
}

export function readHiring(form: FormData) {
  const headline = formText(form, "headline");
  const description = formText(form, "description");
  const raw = formText(form, "contactUrl");
  const contactUrl = normalizeUrl(raw);
  if (
    !headline ||
    headline.length > 80 ||
    description.length > 1000 ||
    !contactUrl
  )
    return {
      error:
        "Add a headline up to 80 characters, a description up to 1,000 characters, and a valid HTTPS contact link.",
    } as const;
  return {
    value: {
      headline,
      description,
      contact_url: contactUrl,
      available: form.get("available") === "on",
    },
  } as const;
}

export function readPortfolio(form: FormData) {
  const title = formText(form, "title");
  const description = formText(form, "description");
  const url = normalizeUrl(formText(form, "url"));
  const tileId = formText(form, "tileId");
  if (
    !title ||
    title.length > 80 ||
    description.length > 300 ||
    !url ||
    (tileId && !UUID.test(tileId))
  )
    return {
      error:
        "Add a title up to 80 characters, a description up to 300 characters, and a valid HTTPS project link.",
    } as const;
  return {
    value: { title, description, url, tile_id: tileId || null },
  } as const;
}
