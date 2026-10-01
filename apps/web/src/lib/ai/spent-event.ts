/**
 * Fired in the browser when AI work may have used tokens (the assistant
 * finished something), so the balance shown can be read again.
 */
export const AI_SPENT_EVENT = "pigxel:ai-spent";

export const notifyAiSpent = () =>
  window.dispatchEvent(new Event(AI_SPENT_EVENT));
