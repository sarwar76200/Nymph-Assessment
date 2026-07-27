"use client";

import { AlertCircle, LoaderCircle, MessageSquareText, Send } from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { API_URL, clearSession, getSessionToken } from "@/lib/auth";

type Message = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
};

type ConversationMessagesProps = {
  conversationId: string;
  conversationStatus: "active" | "completed";
  onMessageCreated: () => void;
};

export function ConversationMessages({
  conversationId,
  conversationStatus,
  onMessageCreated,
}: ConversationMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasAssistantStarted, setHasAssistantStarted] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      clearSession();
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/v1/conversations/${conversationId}/messages?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 401) {
        clearSession();
        return;
      }

      if (response.status === 404) {
        throw new Error("This conversation is no longer available.");
      }

      if (!response.ok) {
        throw new Error("Unable to load the message thread.");
      }

      setMessages((await response.json()) as Message[]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load the message thread.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMessages();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const messageContent = content.trim();
    const token = getSessionToken();

    if (!messageContent || !token || conversationStatus === "completed") {
      return;
    }

    const requestId = Date.now();
    const optimisticMessageId = `pending-user-${requestId}`;
    const streamingAssistantId = `pending-assistant-${requestId}`;
    const optimisticMessage: Message = {
      id: optimisticMessageId,
      conversation_id: conversationId,
      role: "user",
      content: messageContent,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setMessages((currentMessages) => [...currentMessages, optimisticMessage]);
    setContent("");
    setIsSending(true);
    setHasAssistantStarted(false);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/v1/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: messageContent }),
        },
      );

      if (response.status === 401) {
        clearSession();
        return;
      }

      if (response.status === 404) {
        throw new Error("This conversation is no longer available.");
      }

      if (!response.ok) {
        throw new Error("Unable to send your message.");
      }

      if (!response.body) {
        throw new Error("The message stream is unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedDoneEvent = false;
      let finalAssistantMessage: Message | null = null;
      let typingQueue = Promise.resolve();

      const typeAssistantChunk = async (chunk: string) => {
        for (const character of chunk) {
          setMessages((currentMessages) => {
            const hasStreamingMessage = currentMessages.some(
              (message) => message.id === streamingAssistantId,
            );

            if (!hasStreamingMessage) {
              return [
                ...currentMessages,
                {
                  id: streamingAssistantId,
                  conversation_id: conversationId,
                  role: "assistant",
                  content: character,
                  created_at: new Date().toISOString(),
                  pending: true,
                },
              ];
            }

            return currentMessages.map((message) =>
              message.id === streamingAssistantId
                ? { ...message, content: message.content + character }
                : message,
            );
          });
          await wait(6);
        }
      };

      const processEvent = (eventBlock: string) => {
        const parsedEvent = parseSseEvent(eventBlock);
        if (!parsedEvent) {
          return;
        }

        if (parsedEvent.event === "user_message") {
          const savedUserMessage = parsedEvent.data as Message;
          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === optimisticMessageId
                ? savedUserMessage
                : message,
            ),
          );
          return;
        }

        if (parsedEvent.event === "assistant_chunk") {
          const chunk = (parsedEvent.data as { content?: unknown }).content;
          if (typeof chunk !== "string") {
            return;
          }

          setHasAssistantStarted(true);
          typingQueue = typingQueue.then(() => typeAssistantChunk(chunk));
          return;
        }

        if (parsedEvent.event === "assistant_message") {
          finalAssistantMessage = parsedEvent.data as Message;
          return;
        }

        if (parsedEvent.event === "done") {
          receivedDoneEvent = true;
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");
        const eventBlocks = buffer.split("\n\n");
        buffer = eventBlocks.pop() ?? "";
        eventBlocks.forEach(processEvent);
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        processEvent(buffer);
      }

      await typingQueue;

      if (!receivedDoneEvent) {
        throw new Error("The assistant response ended unexpectedly.");
      }

      if (!finalAssistantMessage) {
        throw new Error("The assistant response was not saved.");
      }

      const savedAssistantMessage = finalAssistantMessage;
      setMessages((currentMessages) => {
        const hasStreamingMessage = currentMessages.some(
          (message) => message.id === streamingAssistantId,
        );

        return hasStreamingMessage
          ? currentMessages.map((message) =>
              message.id === streamingAssistantId
                ? savedAssistantMessage
                : message,
            )
          : [...currentMessages, savedAssistantMessage];
      });

      onMessageCreated();
    } catch (requestError) {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === optimisticMessageId
            ? { ...message, pending: false, failed: true }
            : message.id === streamingAssistantId
              ? { ...message, pending: false, failed: true }
              : message,
        ),
      );
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send your message.",
      );
    } finally {
      setIsSending(false);
      setHasAssistantStarted(false);
    }
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4">
        {isLoading ? (
          <MessageSkeleton />
        ) : error && messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <AlertCircle size={22} className="text-red-400" />
            <p className="mt-2 text-xs text-slate-500">{error}</p>
            <button
              type="button"
              onClick={loadMessages}
              className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Try again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <MessageSquareText size={18} />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">Start the conversation</p>
            <p className="mt-1 text-xs text-slate-400">Send a message to your AI support agent.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isSending && !hasAssistantStarted && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error && messages.length > 0 && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-slate-100 bg-white p-3">
        {conversationStatus === "completed" ? (
          <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-xs font-medium text-slate-500">
            This conversation is closed.
          </p>
        ) : (
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pl-3 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
            <textarea
              aria-label="Message"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={5000}
              placeholder="Type your message..."
              className="max-h-24 min-h-8 flex-1 resize-none py-1.5 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={isSending || !content.trim()}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        )}
      </form>
    </>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${
          isUser
            ? "rounded-br-md bg-indigo-600 text-white"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.content}</p>
        <time
          dateTime={message.created_at}
          className={`mt-1 block text-[10px] ${
            message.failed
              ? isUser
                ? "text-right text-red-200"
                : "text-red-400"
              : isUser
                ? "text-right text-indigo-200"
                : "text-slate-400"
          }`}
        >
          {message.pending
            ? isUser
              ? "Sending..."
              : "Writing..."
            : message.failed
              ? isUser
                ? "Not sent"
                : "Response interrupted"
              : formatMessageTime(message.created_at)}
        </time>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-label="Assistant is typing">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3.5">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-1.5 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${dot * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-14 w-3/5 animate-pulse rounded-2xl rounded-bl-md bg-slate-200" />
      <div className="ml-auto h-16 w-2/3 animate-pulse rounded-2xl rounded-br-md bg-indigo-100" />
      <div className="h-20 w-3/4 animate-pulse rounded-2xl rounded-bl-md bg-slate-200" />
    </div>
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function parseSseEvent(
  eventBlock: string,
): { event: string; data: unknown } | null {
  const lines = eventBlock.split("\n");
  const event = lines
    .find((line) => line.startsWith("event:"))
    ?.slice("event:".length)
    .trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart())
    .join("\n");

  if (!event || !data) {
    return null;
  }

  try {
    return { event, data: JSON.parse(data) as unknown };
  } catch {
    return null;
  }
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}
