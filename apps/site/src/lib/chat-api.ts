/**
 * Chat API client for the 1Router backend.
 *
 * Supports both streaming (SSE) and non-streaming chat completions.
 * The API URL and key are resolved from environment variables.
 */

// Chat requests go through the same-origin Next.js server route. The route
// adds the router credential server-side so it never ships in the browser.
const CHAT_ENDPOINT = "/api/chat";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

/**
 * Send a chat completion request and stream the response via SSE.
 *
 * Uses the Fetch API with a ReadableStream reader to parse SSE `data:` lines
 * from the upstream response. This avoids needing the EventSource API (which
 * doesn't support POST requests or custom headers).
 */
export async function streamChatCompletion(
  model: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let message = `API error (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        message = errorJson.error?.message || message;
      } catch {
        if (errorText) message = errorText;
      }
      throw new Error(message);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body to stream");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (line.startsWith("data: ")) {
          const data = line.slice(6);

          if (data === "[DONE]") {
            callbacks.onDone();
            return;
          }

          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) {
              callbacks.onToken(delta.content);
            }
          } catch {
            // Ignore malformed JSON lines (keepalive comments, etc.)
          }
        }
      }
    }

    callbacks.onDone();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      callbacks.onDone();
      return;
    }
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

