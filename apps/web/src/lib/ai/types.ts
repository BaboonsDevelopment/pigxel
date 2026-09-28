export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  /** Data URL of a generated picture, on assistant messages. */
  image?: string;
};

export type Intent = "generate" | "edit";

export type GeneratedImage = { mimeType: string; base64: string };

export interface AiProvider {
  /** Decides what the user wants. Uses the free text model. */
  route(message: string): Promise<Intent>;
  /** Edit mode: works on the existing tile. Uses the free text model. */
  edit(messages: ChatMessage[]): Promise<string>;
  /** Generate mode: draws a new picture. Uses the paid image model. */
  generate(prompt: string): Promise<GeneratedImage>;
}
