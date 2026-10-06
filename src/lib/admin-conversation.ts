import { z } from "zod";

const Parts = z.array(z.object({ type: z.literal("text"), text: z.string() }));
const Role = z.enum(["user", "assistant"]);

export function readConversationMessage(message: {
  role: unknown;
  parts: unknown;
  actions?: unknown;
}) {
  const parts = Parts.safeParse(message.parts);
  const role = Role.safeParse(message.role);
  if (!parts.success || !role.success) return null;
  const content = parts.data
    .map((part) => part.text)
    .join("\n")
    .trim();
  if (!content) return null;
  const actions = z.array(z.string()).safeParse(message.actions);
  return { role: role.data, content, actions: actions.success ? actions.data : [] };
}

// The database query returns newest first; the model needs chronological turns.
export function conversationModelHistory(
  rows: { role: unknown; parts: unknown; actions?: unknown }[],
) {
  return rows
    .slice(0, 20)
    .reverse()
    .flatMap((row) => {
      const message = readConversationMessage(row);
      if (!message) return [];
      const actions =
        message.role === "assistant" && message.actions.length
          ? `\nFerramentas executadas neste turno: ${message.actions.join(", ")}`
          : "";
      return [{ role: message.role, content: message.content.slice(0, 4000) + actions }];
    });
}
