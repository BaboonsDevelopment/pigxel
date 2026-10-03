export const AI_SPENT_EVENT = "pigxel:ai-spent";

export const notifyAiSpent = () =>
  window.dispatchEvent(new Event(AI_SPENT_EVENT));
