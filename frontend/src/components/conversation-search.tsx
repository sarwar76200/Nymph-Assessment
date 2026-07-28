"use client";

import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  MessageSquareText,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useOrganization } from "@/components/organization-provider";
import { clearSession, getSessionToken } from "@/lib/auth";
import { organizationApiUrl } from "@/lib/organizations";

type SearchMessage = {
  id: string;
  conversation_id: string;
  author_user_id: string | null;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type SearchResult = {
  id: string;
  organization_id: string;
  created_by_user_id: string | null;
  title: string;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
  matched_messages: SearchMessage[];
};

export function ConversationSearch() {
  const { activeOrganizationId, handleOrganizationForbidden } =
    useOrganization();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedConversations, setExpandedConversations] = useState<
    Set<string>
  >(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const searchQuery = query.trim();
    if (!searchQuery) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      const token = getSessionToken();
      if (!token || !activeOrganizationId) {
        clearSession();
        return;
      }

      setIsSearching(true);
      setError("");

      try {
        const parameters = new URLSearchParams({ query: searchQuery });
        const response = await fetch(
          organizationApiUrl(
            activeOrganizationId,
            `/conversations/search?${parameters}`,
          ),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        );

        if (response.status === 401) {
          clearSession();
          return;
        }

        if (response.status === 403) {
          await handleOrganizationForbidden();
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to search conversations.");
        }

        setResults((await response.json()) as SearchResult[]);
        setExpandedConversations(new Set());
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to search conversations.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeOrganizationId, handleOrganizationForbidden, query]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setIsOpen(Boolean(value.trim()));

    if (value.trim()) {
      setIsSearching(true);
      setError("");
    } else {
      setResults([]);
      setError("");
      setIsSearching(false);
      setExpandedConversations(new Set());
    }
  }

  function toggleConversation(conversationId: string) {
    setExpandedConversations((currentExpanded) => {
      const nextExpanded = new Set(currentExpanded);
      if (nextExpanded.has(conversationId)) {
        nextExpanded.delete(conversationId);
      } else {
        nextExpanded.add(conversationId);
      }
      return nextExpanded;
    });
  }

  const totalMatches = results.reduce(
    (total, result) => total + result.matched_messages.length,
    0,
  );

  return (
    <div className="relative w-full max-w-sm">
      <Search
        size={16}
        className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-slate-400"
      />
      <input
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => {
          if (query.trim()) {
            setIsOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            handleQueryChange("");
          }
        }}
        aria-label="Search conversations"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="conversation-search-results"
        aria-autocomplete="list"
        placeholder="Search conversation messages..."
        className="relative z-10 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-9 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => handleQueryChange("")}
          className="absolute top-1/2 right-2 z-20 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-x-0 top-16 bottom-0 z-40 bg-slate-950/25 px-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setIsOpen(false);
            }
          }}
        >
          <section
            id="conversation-search-results"
            aria-label="Search results"
            className="mx-auto max-h-[calc(100vh-6rem)] ml-12 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 align-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">Search results</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isSearching
                    ? "Searching your conversations..."
                    : `${totalMatches} message${totalMatches === 1 ? "" : "s"} in ${results.length} conversation${results.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close search results"
                onClick={() => setIsOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={17} />
              </button>
            </div>

            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-3">
              {isSearching ? (
                <div className="flex min-h-64 items-center justify-center">
                  <LoaderCircle size={24} className="animate-spin text-indigo-600" />
                </div>
              ) : error ? (
                <div className="flex min-h-64 items-center justify-center px-6 text-center text-sm text-red-600">
                  {error}
                </div>
              ) : results.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                  <div className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Search size={20} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No matching messages
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try another word or phrase.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((result) => {
                    const isExpanded = expandedConversations.has(result.id);
                    const visibleMessages = isExpanded
                      ? result.matched_messages
                      : result.matched_messages.slice(0, 1);
                    const hiddenCount = result.matched_messages.length - 1;

                    return (
                      <article
                        key={result.id}
                        className="overflow-hidden rounded-xl border border-slate-200"
                      >
                        <div className="flex items-center gap-3 bg-slate-50/80 px-4 py-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                            <MessageSquareText size={17} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold text-slate-800">
                              <HighlightedText text={result.title} query={query} />
                            </h3>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {result.matched_messages.length} matching message
                              {result.matched_messages.length === 1 ? "" : "s"}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${result.status === "active"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                              }`}
                          >
                            {result.status}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {visibleMessages.map((message) => (
                            <button
                              type="button"
                              key={message.id}
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent(
                                    "open-conversation-message",
                                    {
                                      detail: {
                                        conversation: result,
                                        messageId: message.id,
                                      },
                                    },
                                  ),
                                );
                                setIsOpen(false);
                              }}
                              className="block w-full px-4 py-2 text-left text-xs leading-5 text-slate-600 hover:bg-indigo-50/50"
                            >
                              <span className="line-clamp-2">
                                <span
                                  className={`font-semibold ${message.role === "user"
                                      ? "text-indigo-600"
                                      : "text-slate-700"
                                    }`}
                                >
                                  {message.role === "user" ? "User" : "Assistant"}:
                                </span>{" "}
                                <HighlightedText
                                  text={message.content}
                                  query={query}
                                />
                              </span>
                            </button>
                          ))}
                        </div>

                        {hiddenCount > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleConversation(result.id)}
                            className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50/50"
                          >
                            {isExpanded ? (
                              <>
                                Show less <ChevronUp size={14} />
                              </>
                            ) : (
                              <>
                                See {hiddenCount} more <ChevronDown size={14} />
                              </>
                            )}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return text;
  }

  const parts: React.ReactNode[] = [];
  const normalizedText = text.toLowerCase();
  let cursor = 0;
  let matchIndex = normalizedText.indexOf(normalizedQuery);

  while (matchIndex !== -1) {
    parts.push(text.slice(cursor, matchIndex));
    parts.push(
      <mark
        key={`${matchIndex}-${cursor}`}
        className="rounded bg-amber-100 px-0.5 text-inherit"
      >
        {text.slice(matchIndex, matchIndex + normalizedQuery.length)}
      </mark>,
    );
    cursor = matchIndex + normalizedQuery.length;
    matchIndex = normalizedText.indexOf(normalizedQuery, cursor);
  }

  parts.push(text.slice(cursor));
  return parts;
}

