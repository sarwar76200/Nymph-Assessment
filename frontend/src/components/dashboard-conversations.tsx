"use client";

import {
  AlertCircle,
  Bot,
  ChevronRight,
  LoaderCircle,
  Maximize2,
  MessageSquareText,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { ConversationMessages } from "@/components/conversation-messages";
import { API_URL, clearSession, getSessionToken } from "@/lib/auth";

type Conversation = {
  id: string;
  user_id: string;
  title: string;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
};

type ConversationContextValue = {
  conversations: Conversation[];
  isLoading: boolean;
  error: string;
  reload: () => void;
};

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/v1/conversations?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        clearSession();
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load your conversations.");
      }

      const data = (await response.json()) as Conversation[];
      setConversations(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load your conversations.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadConversations();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadConversations]);

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        isLoading,
        error,
        reload: loadConversations,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

function useConversations() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("Conversation components require ConversationProvider.");
  }
  return context;
}

export function ConversationCountCard() {
  const { conversations, isLoading } = useConversations();

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <MessageSquareText size={19} />
        </div>
        <MoreHorizontal size={17} className="text-slate-300" />
      </div>
      <p className="mt-5 text-2xl font-bold tracking-tight">
        {isLoading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-100" /> : conversations.length}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">Total conversations</p>
      <p className="mt-3 text-[11px] text-slate-400">Your saved AI chats</p>
    </article>
  );
}

export function StartConversationButton() {
  const { reload } = useConversations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const conversationTitle = title.trim();
    const token = getSessionToken();

    if (!conversationTitle || !token) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/v1/conversations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: conversationTitle }),
      });

      if (response.status === 401) {
        clearSession();
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to create the conversation.");
      }

      await reload();
      setIsDialogOpen(false);
      setTitle("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create the conversation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setIsDialogOpen(true);
        }}
        className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 sm:self-auto"
      >
        <Plus size={17} />
        Start conversation
      </button>

      {isDialogOpen && (
        <ConversationTitleDialog
          heading="Start a conversation"
          description="Give your new conversation a clear title."
          title={title}
          error={error}
          isSubmitting={isSubmitting}
          submitLabel="Create conversation"
          submittingLabel="Creating..."
          onTitleChange={setTitle}
          onSubmit={handleCreate}
          onCancel={() => {
            if (!isSubmitting) {
              setIsDialogOpen(false);
              setTitle("");
              setError("");
            }
          }}
        />
      )}
    </>
  );
}

export function RecentConversations() {
  const { conversations, isLoading, error, reload } = useConversations();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const recentConversations = conversations.slice(0, 4);

  function openRenameDialog(conversation: Conversation) {
    setRenameTarget(conversation);
    setRenameTitle(conversation.title);
    setRenameError("");
    setOpenMenuId(null);
  }

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = renameTitle.trim();
    const token = getSessionToken();

    if (!renameTarget || !title || !token) {
      return;
    }

    setIsRenaming(true);
    setRenameError("");

    try {
      const response = await fetch(
        `${API_URL}/api/v1/conversations/${renameTarget.id}/title`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title }),
        },
      );

      if (response.status === 401) {
        clearSession();
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to rename this conversation.");
      }

      if (selectedConversation?.id === renameTarget.id) {
        setSelectedConversation({ ...selectedConversation, title });
      }
      await reload();
      setRenameTarget(null);
    } catch (requestError) {
      setRenameError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to rename this conversation.",
      );
    } finally {
      setIsRenaming(false);
    }
  }

  function openDeleteDialog(conversation: Conversation) {
    setDeleteTarget(conversation);
    setDeleteError("");
    setOpenMenuId(null);
  }

  async function handleDelete() {
    const token = getSessionToken();
    if (!deleteTarget || !token) {
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch(
        `${API_URL}/api/v1/conversations/${deleteTarget.id}`,
        {
          method: "DELETE",
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

      if (response.status !== 204) {
        throw new Error("Unable to delete this conversation.");
      }

      if (selectedConversation?.id === deleteTarget.id) {
        setSelectedConversation(null);
      }
      await reload();
      setDeleteTarget(null);
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete this conversation.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6">
          <div>
            <h2 className="font-semibold">Recent conversations</h2>
            <p className="mt-0.5 text-xs text-slate-400">Your latest chats with AI agents</p>
          </div>
          <a
            href="#"
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View all <ChevronRight size={14} />
          </a>
        </div>

        {isLoading ? (
          <ConversationSkeleton />
        ) : error ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <AlertCircle size={24} className="text-red-400" />
            <p className="mt-3 text-sm font-medium text-slate-700">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        ) : recentConversations.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <MessageSquareText size={20} />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">No conversations yet</p>
            <p className="mt-1 text-xs text-slate-400">Start a conversation to see it here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentConversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                isMenuOpen={openMenuId === conversation.id}
                onOpen={() => {
                  setSelectedConversation(conversation);
                  setOpenMenuId(null);
                }}
                onToggleMenu={() =>
                  setOpenMenuId((currentId) =>
                    currentId === conversation.id ? null : conversation.id,
                  )
                }
                onRename={() => openRenameDialog(conversation)}
                onDelete={() => openDeleteDialog(conversation)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedConversation && (
        <ChatWindow
          conversation={selectedConversation}
          onDismiss={() => setSelectedConversation(null)}
          onStatusChanged={reload}
        />
      )}

      {renameTarget && (
        <ConversationTitleDialog
          heading="Rename conversation"
          description="Choose a clear, memorable title."
          title={renameTitle}
          error={renameError}
          isSubmitting={isRenaming}
          submitLabel="Save title"
          submittingLabel="Saving..."
          onTitleChange={setRenameTitle}
          onSubmit={handleRename}
          onCancel={() => {
            if (!isRenaming) {
              setRenameTarget(null);
            }
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConversationDialog
          conversationTitle={deleteTarget.title}
          error={deleteError}
          isSubmitting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!isDeleting) {
              setDeleteTarget(null);
            }
          }}
        />
      )}
    </>
  );
}

type ConversationRowProps = {
  conversation: Conversation;
  isMenuOpen: boolean;
  onOpen: () => void;
  onToggleMenu: () => void;
  onRename: () => void;
  onDelete: () => void;
};

function ConversationRow({
  conversation,
  isMenuOpen,
  onOpen,
  onToggleMenu,
  onRename,
  onDelete,
}: ConversationRowProps) {
  return (
    <div className="flex items-center transition hover:bg-slate-50/70">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-start gap-3 py-4 pr-2 pl-5 text-left focus:outline-none md:items-center md:pl-6"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
          AI
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-800">
              {conversation.title}
            </h3>
            <span
              className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize sm:inline ${
                conversation.status === "active"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {conversation.status}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-slate-400">
            AI Support Agent · Started {formatDate(conversation.created_at)}
          </p>
        </div>
        <time
          dateTime={conversation.updated_at}
          className="shrink-0 text-[11px] text-slate-400"
        >
          {formatRelativeTime(conversation.updated_at)}
        </time>
      </button>

      <div className="relative mr-3 shrink-0">
        <button
          type="button"
          aria-label={`Options for ${conversation.title}`}
          aria-expanded={isMenuOpen}
          onClick={onToggleMenu}
          className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <MoreHorizontal size={17} />
        </button>
        {isMenuOpen && (
          <div className="absolute top-9 right-0 z-20 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
            <button
              type="button"
              onClick={onRename}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <Pencil size={15} />
              Rename conversation
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={15} />
              Delete conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type DeleteConversationDialogProps = {
  conversationTitle: string;
  error: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function DeleteConversationDialog({
  conversationTitle,
  error,
  isSubmitting,
  onConfirm,
  onCancel,
}: DeleteConversationDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-[2px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-conversation-title"
        aria-describedby="delete-conversation-description"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Trash2 size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="delete-conversation-title" className="font-semibold text-slate-900">
              Delete conversation?
            </h2>
            <p
              id="delete-conversation-description"
              className="mt-2 text-sm leading-6 text-slate-500"
            >
              <span className="font-medium text-slate-700">
                &ldquo;{conversationTitle}&rdquo;
              </span>{" "}
              will be permanently deleted. This action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close delete dialog"
            disabled={isSubmitting}
            onClick={onCancel}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={17} />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="h-10 rounded-lg px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <LoaderCircle size={15} className="animate-spin" />}
            {isSubmitting ? "Deleting..." : "Delete conversation"}
          </button>
        </div>
      </div>
    </div>
  );
}

type ConversationTitleDialogProps = {
  heading: string;
  description: string;
  title: string;
  error: string;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  onTitleChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

function ConversationTitleDialog({
  heading,
  description,
  title,
  error,
  isSubmitting,
  submitLabel,
  submittingLabel,
  onTitleChange,
  onSubmit,
  onCancel,
}: ConversationTitleDialogProps) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-[2px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-conversation-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="rename-conversation-title" className="font-semibold text-slate-900">
              {heading}
            </h2>
            <p className="mt-1 text-xs text-slate-400">{description}</p>
          </div>
          <button
            type="button"
            aria-label="Close rename dialog"
            disabled={isSubmitting}
            onClick={onCancel}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5">
          <label htmlFor="conversation-title" className="text-sm font-medium text-slate-700">
            Conversation title
          </label>
          <input
            id="conversation-title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            minLength={1}
            maxLength={200}
            required
            autoFocus
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
              className="h-10 rounded-lg px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <LoaderCircle size={15} className="animate-spin" />}
              {isSubmitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type ChatWindowProps = {
  conversation: Conversation;
  onDismiss: () => void;
  onStatusChanged: () => void;
};

function ChatWindow({
  conversation,
  onDismiss,
  onStatusChanged,
}: ChatWindowProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState("");

  async function handleCloseConversation() {
    const token = getSessionToken();
    if (!token) {
      clearSession();
      return;
    }

    setIsClosing(true);
    setCloseError("");

    try {
      const response = await fetch(
        `${API_URL}/api/v1/conversations/${conversation.id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "completed" }),
        },
      );

      if (response.status === 401) {
        clearSession();
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to close this conversation.");
      }

      onStatusChanged();
      onDismiss();
    } catch (requestError) {
      setCloseError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to close this conversation.",
      );
      setIsMenuOpen(false);
    } finally {
      setIsClosing(false);
    }
  }

  return (
    <section
      aria-label={`Chat: ${conversation.title}`}
      className="fixed right-4 bottom-4 z-50 w-[calc(100%-2rem)] max-w-md overflow-visible rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 sm:right-6 sm:bottom-6"
    >
      <header
        className={`flex items-center gap-3 px-4 ${
          isMinimized ? "h-14" : "h-16 border-b border-slate-100"
        }`}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <Bot size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-slate-800">
            {conversation.title}
          </h2>
          {!isMinimized && (
            <p className="mt-0.5 text-[11px] text-slate-400">AI Support Agent</p>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Conversation options"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <MoreHorizontal size={18} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-10 z-10 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
              <button
                type="button"
                disabled={isClosing}
                onClick={handleCloseConversation}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isClosing && <LoaderCircle size={15} className="animate-spin" />}
                {isClosing ? "Closing..." : "Close conversation"}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
          onClick={() => {
            setIsMinimized((minimized) => !minimized);
            setIsMenuOpen(false);
          }}
          className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          {isMinimized ? <Maximize2 size={16} /> : <Minus size={18} />}
        </button>
      </header>

      {!isMinimized && (
        <div className="flex h-96 flex-col">
          <ConversationMessages
            key={conversation.id}
            conversationId={conversation.id}
            conversationStatus={conversation.status}
            onMessageCreated={onStatusChanged}
          />
          {closeError && (
            <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
              {closeError}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ConversationSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3 px-5 py-4 md:px-6">
          <div className="size-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatRelativeTime(value: string) {
  const elapsedSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(elapsedSeconds) < 60) {
    return formatter.format(elapsedSeconds, "second");
  }

  const elapsedMinutes = Math.round(elapsedSeconds / 60);
  if (Math.abs(elapsedMinutes) < 60) {
    return formatter.format(elapsedMinutes, "minute");
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (Math.abs(elapsedHours) < 24) {
    return formatter.format(elapsedHours, "hour");
  }

  const elapsedDays = Math.round(elapsedHours / 24);
  return formatter.format(elapsedDays, "day");
}
