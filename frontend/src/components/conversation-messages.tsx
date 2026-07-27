"use client";

import {
  AlertCircle,
  FileText,
  LoaderCircle,
  MessageSquareText,
  Paperclip,
  Send,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
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

type ThreadDocument = {
  id: string;
  conversation_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
};

type TimelineItem =
  | { type: "message"; timestamp: string; message: Message }
  | { type: "document"; timestamp: string; document: ThreadDocument };

type ConversationMessagesProps = {
  conversationId: string;
  conversationStatus: "active" | "completed";
  targetMessageId: string | null;
  onMessageCreated: (updatedAt: string) => void;
};

export function ConversationMessages({
  conversationId,
  conversationStatus,
  targetMessageId,
  onMessageCreated,
}: ConversationMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<ThreadDocument[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [hasAssistantStarted, setHasAssistantStarted] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const hasPositionedInitialThread = useRef(false);
  const isViewingSearchTarget = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        `${API_URL}/api/v1/conversations/${conversationId}/messages?limit=200`,
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

  const loadDocuments = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      clearSession();
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/documents?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        clearSession();
        return;
      }

      if (!response.ok) {
        return;
      }

      const allDocuments = (await response.json()) as ThreadDocument[];
      setDocuments(
        allDocuments.filter(
          (document) => document.conversation_id === conversationId,
        ),
      );
    } catch {
      // Messages remain usable if document metadata cannot be loaded.
    }
  }, [conversationId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMessages();
      void loadDocuments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDocuments, loadMessages]);

  useEffect(() => {
    const handleDocumentCreated = (event: Event) => {
      const createdDocument = (event as CustomEvent<ThreadDocument>).detail;
      if (
        !createdDocument ||
        createdDocument.conversation_id !== conversationId
      ) {
        return;
      }

      setDocuments((currentDocuments) => [
        ...currentDocuments.filter(
          (document) => document.id !== createdDocument.id,
        ),
        createdDocument,
      ]);
    };

    window.addEventListener("document-created", handleDocumentCreated);
    return () =>
      window.removeEventListener("document-created", handleDocumentCreated);
  }, [conversationId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const messageContent = content.trim();
    const token = getSessionToken();

    if (!messageContent || !token || conversationStatus === "completed") {
      return;
    }

    isViewingSearchTarget.current = false;
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
      const streamState: { finalAssistantMessage: Message | null } = {
        finalAssistantMessage: null,
      };
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
          streamState.finalAssistantMessage = parsedEvent.data as Message;
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

      if (!streamState.finalAssistantMessage) {
        throw new Error("The assistant response was not saved.");
      }

      const savedAssistantMessage = streamState.finalAssistantMessage;
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

      onMessageCreated(savedAssistantMessage.created_at);
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

  async function handleDocumentSelected(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const fileType = getDocumentFileType(file.name);
    if (!fileType) {
      setError("Choose a PDF, DOCX, or TXT file.");
      return;
    }

    if (file.size <= 0) {
      setError("The selected file is empty.");
      return;
    }

    const token = getSessionToken();
    if (!token) {
      clearSession();
      return;
    }

    setIsUploadingDocument(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/v1/conversations/${conversationId}/documents`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            file_type: fileType,
            file_size: file.size,
          }),
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
        throw new Error("Unable to add the document.");
      }

      const createdDocument = (await response.json()) as ThreadDocument;
      window.dispatchEvent(
        new CustomEvent("document-created", {
          detail: createdDocument,
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add the document.",
      );
    } finally {
      setIsUploadingDocument(false);
    }
  }

  const timelineItems: TimelineItem[] = [
    ...messages.map(
      (message): TimelineItem => ({
        type: "message",
        timestamp: message.created_at,
        message,
      }),
    ),
    ...documents.map(
      (document): TimelineItem => ({
        type: "document",
        timestamp: document.uploaded_at,
        document,
      }),
    ),
  ].sort(
    (firstItem, secondItem) =>
      new Date(firstItem.timestamp).getTime() -
      new Date(secondItem.timestamp).getTime(),
  );

  useLayoutEffect(() => {
    const scrollContainer = threadScrollRef.current;
    if (
      isLoading ||
      hasPositionedInitialThread.current ||
      timelineItems.length === 0 ||
      !scrollContainer
    ) {
      return;
    }

    if (targetMessageId) {
      const targetMessage = scrollContainer.querySelector<HTMLElement>(
        `[data-message-id="${targetMessageId}"]`,
      );
      if (targetMessage) {
        targetMessage.scrollIntoView({ block: "center" });
        isViewingSearchTarget.current = true;
        hasPositionedInitialThread.current = true;
        return;
      }
    }

    const bottom = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    scrollContainer.scrollTop = Math.max(0, bottom - 220);
    hasPositionedInitialThread.current = true;
  }, [isLoading, targetMessageId, timelineItems.length]);

  useEffect(() => {
    if (
      !hasPositionedInitialThread.current ||
      isLoading ||
      (isViewingSearchTarget.current && !isSending)
    ) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [documents, isLoading, isSending, messages]);

  return (
    <>
      <div
        ref={threadScrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4"
      >
        {isLoading ? (
          <MessageSkeleton />
        ) : error && timelineItems.length === 0 ? (
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
        ) : timelineItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <MessageSquareText size={18} />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">Start the conversation</p>
            <p className="mt-1 text-xs text-slate-400">Send a message to your AI support agent.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {timelineItems.map((item) =>
              item.type === "message" ? (
                <MessageBubble
                  key={`message-${item.message.id}`}
                  message={item.message}
                />
              ) : (
                <DocumentTimelineItem
                  key={`document-${item.document.id}`}
                  document={item.document}
                />
              ),
            )}
            {isSending && !hasAssistantStarted && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error && timelineItems.length > 0 && (
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleDocumentSelected}
              className="sr-only"
            />
            <button
              type="button"
              aria-label="Add document"
              disabled={isUploadingDocument || isSending}
              onClick={() => fileInputRef.current?.click()}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploadingDocument ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Paperclip size={17} />
              )}
            </button>
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
    <div
      data-message-id={message.id}
      className={`flex scroll-m-20 ${isUser ? "justify-end" : "justify-start"}`}
    >
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

function DocumentTimelineItem({ document }: { document: ThreadDocument }) {
  return (
    <div className="flex justify-end py-1">
      <div className="flex max-w-[85%] items-center gap-2.5 rounded-2xl rounded-br-md border border-indigo-100 bg-indigo-50 px-3 py-2 shadow-sm">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600">
          <FileText size={15} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-700">
            {document.filename}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {document.file_type.toUpperCase()} · {formatFileSize(document.file_size)} ·{" "}
            {formatTimelineDate(document.uploaded_at)}
          </p>
        </div>
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

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDocumentFileType(
  filename: string,
): "pdf" | "docx" | "txt" | null {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension === "pdf" || extension === "docx" || extension === "txt"
    ? extension
    : null;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
