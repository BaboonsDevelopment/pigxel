export type ChatMessage = { role: "user" | "assistant"; content: string };

export type GeneratedImage = { mimeType: string; base64: string };

export interface AiProvider {
  /** Edit mode: works on the existing tile. Uses the free text model. */
  edit(messages: ChatMessage[]): Promise<string>;
  /** Generate mode: draws a new picture. Uses the paid image model. */
  generate(prompt: string): Promise<GeneratedImage>;
}
