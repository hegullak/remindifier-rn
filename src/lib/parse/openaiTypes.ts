export type OpenAIChatCompletion = {
  choices?: Array<{
    message?: { content?: string | null; refusal?: string | null };
  }>;
};

export function extractCompletionContent(body: OpenAIChatCompletion): string | null {
  const message = body.choices?.[0]?.message;
  if (!message?.content || message.refusal) return null;
  return message.content;
}
