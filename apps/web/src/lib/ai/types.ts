export type ChatMessage = { role: "user" | "assistant"; content: string };

export interface AiProvider {
  reply(messages: ChatMessage[]): Promise<string>;
}
