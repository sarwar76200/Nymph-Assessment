"use client";

import {
  AlertCircle,
  FileText,
  LoaderCircle,
  Plus,
  Upload,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useConversations } from "@/components/dashboard-conversations";
import { API_URL, clearSession, getSessionToken } from "@/lib/auth";

type DocumentMetadata = {
  id: string;
  conversation_id: string;
  filename: string;
  file_type: "pdf" | "docx" | "txt";
  file_size: number;
  uploaded_at: string;
};

type DocumentContextValue = {
  documents: DocumentMetadata[];
  isLoading: boolean;
  error: string;
  openUpload: () => void;
  reload: () => void;
};

const DocumentContext = createContext<DocumentContextValue | null>(null);
const ALLOWED_FILE_TYPES = ["pdf", "docx", "txt"] as const;

export function DocumentProvider({ children }: { children: ReactNode }) {
  const { conversations } = useConversations();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const loadDocuments = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

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
        throw new Error("Unable to load your documents.");
      }

      setDocuments((await response.json()) as DocumentMetadata[]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load your documents.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDocuments]);

  useEffect(() => {
    const handleDocumentCreated = (event: Event) => {
      const createdDocument = (event as CustomEvent<DocumentMetadata>).detail;
      if (!createdDocument) {
        return;
      }

      setDocuments((currentDocuments) => [
        createdDocument,
        ...currentDocuments.filter(
          (document) => document.id !== createdDocument.id,
        ),
      ]);
    };

    window.addEventListener("document-created", handleDocumentCreated);
    return () =>
      window.removeEventListener("document-created", handleDocumentCreated);
  }, []);

  function openUpload() {
    const defaultConversation =
      conversations.find((conversation) => conversation.status === "active") ??
      conversations[0];

    setSelectedConversationId(defaultConversation?.id ?? "");
    setSelectedFile(null);
    setUploadError("");
    setIsUploadOpen(true);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setUploadError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const fileType = getFileType(file.name);
    if (!fileType) {
      setSelectedFile(null);
      setUploadError("Choose a PDF, DOCX, or TXT file.");
      event.target.value = "";
      return;
    }

    if (file.size <= 0) {
      setSelectedFile(null);
      setUploadError("The selected file is empty.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getSessionToken();
    const fileType = selectedFile ? getFileType(selectedFile.name) : null;

    if (!token || !selectedConversationId || !selectedFile || !fileType) {
      setUploadError("Select a conversation and a supported file.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const response = await fetch(
        `${API_URL}/api/v1/conversations/${selectedConversationId}/documents`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: selectedFile.name,
            file_type: fileType,
            file_size: selectedFile.size,
          }),
        },
      );

      if (response.status === 401) {
        clearSession();
        return;
      }

      if (response.status === 404) {
        throw new Error("The selected conversation is no longer available.");
      }

      if (!response.ok) {
        throw new Error("Unable to save the document metadata.");
      }

      const createdDocument = (await response.json()) as DocumentMetadata;
      window.dispatchEvent(
        new CustomEvent("document-created", {
          detail: createdDocument,
        }),
      );
      setIsUploadOpen(false);
      setSelectedFile(null);
    } catch (requestError) {
      setUploadError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the document metadata.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <DocumentContext.Provider
      value={{
        documents,
        isLoading,
        error,
        openUpload,
        reload: loadDocuments,
      }}
    >
      {children}
      {isUploadOpen && (
        <DocumentUploadDialog
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          selectedFile={selectedFile}
          error={uploadError}
          isUploading={isUploading}
          onConversationChange={setSelectedConversationId}
          onFileChange={handleFileChange}
          onSubmit={handleUpload}
          onCancel={() => {
            if (!isUploading) {
              setIsUploadOpen(false);
            }
          }}
        />
      )}
    </DocumentContext.Provider>
  );
}

function useDocuments() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("Document components require DocumentProvider.");
  }
  return context;
}

export function DocumentCountCard() {
  const { documents, isLoading } = useDocuments();

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <FileText size={19} />
        </div>
      </div>
      <p className="mt-5 text-2xl font-bold tracking-tight">
        {isLoading ? (
          <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-100" />
        ) : (
          documents.length
        )}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">Documents</p>
      <p className="mt-3 text-[11px] text-slate-400">Metadata saved for AI context</p>
    </article>
  );
}

export function RecentDocuments() {
  const { documents, isLoading, error, openUpload, reload } = useDocuments();
  const recentDocuments = documents.slice(0, 3);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-semibold">Recent documents</h2>
          <p className="mt-0.5 text-xs text-slate-400">Knowledge added recently</p>
        </div>
        <button
          type="button"
          aria-label="Add document"
          onClick={openUpload}
          className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
        >
          <Plus size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3 px-5 py-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="size-9 animate-pulse rounded-lg bg-slate-100" />
              <div className="flex-1">
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex min-h-40 flex-col items-center justify-center px-5 text-center">
          <AlertCircle size={20} className="text-red-400" />
          <p className="mt-2 text-xs text-slate-500">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-3 text-xs font-semibold text-indigo-600"
          >
            Try again
          </button>
        </div>
      ) : recentDocuments.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center px-5 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <FileText size={18} />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">No documents yet</p>
          <button
            type="button"
            onClick={openUpload}
            className="mt-2 text-xs font-semibold text-indigo-600"
          >
            Add your first document
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 px-5">
          {recentDocuments.map((document) => (
            <article key={document.id} className="flex items-center gap-3 py-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <FileText size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-slate-700">
                  {document.filename}
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {document.file_type.toUpperCase()} · {formatFileSize(document.file_size)}
                </p>
              </div>
              <time
                dateTime={document.uploaded_at}
                className="shrink-0 text-[11px] text-slate-400"
              >
                {formatDocumentDate(document.uploaded_at)}
              </time>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function UploadDocumentButton() {
  const { openUpload } = useDocuments();

  return (
    <button
      type="button"
      onClick={openUpload}
      className="mt-4 text-xs font-semibold text-indigo-300 hover:text-indigo-200"
    >
      Add a document →
    </button>
  );
}

type DocumentUploadDialogProps = {
  conversations: ReturnType<typeof useConversations>["conversations"];
  selectedConversationId: string;
  selectedFile: File | null;
  error: string;
  isUploading: boolean;
  onConversationChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

function DocumentUploadDialog({
  conversations,
  selectedConversationId,
  selectedFile,
  error,
  isUploading,
  onConversationChange,
  onFileChange,
  onSubmit,
  onCancel,
}: DocumentUploadDialogProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-document-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="upload-document-title" className="font-semibold text-slate-900">
              Add document metadata
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              The file itself will not be uploaded.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close upload dialog"
            disabled={isUploading}
            onClick={onCancel}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={17} />
          </button>
        </div>

        {conversations.length === 0 ? (
          <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Create a conversation before adding a document.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="document-conversation" className="text-sm font-medium text-slate-700">
                Conversation
              </label>
              <select
                id="document-conversation"
                value={selectedConversationId}
                onChange={(event) => onConversationChange(event.target.value)}
                required
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
              >
                {conversations.map((conversation) => (
                  <option key={conversation.id} value={conversation.id}>
                    {conversation.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="document-file" className="text-sm font-medium text-slate-700">
                Document
              </label>
              <label
                htmlFor="document-file"
                className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <Upload size={20} className="text-indigo-500" />
                <span className="mt-2 max-w-full truncate text-sm font-medium text-slate-700">
                  {selectedFile?.name ?? "Choose a PDF, DOCX, or TXT file"}
                </span>
                <span className="mt-1 text-xs text-slate-400">
                  {selectedFile
                    ? formatFileSize(selectedFile.size)
                    : "Only filename, type, and size are saved"}
                </span>
              </label>
              <input
                id="document-file"
                type="file"
                accept=".pdf,.docx,.txt"
                required
                onChange={onFileChange}
                className="sr-only"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isUploading}
                onClick={onCancel}
                className="h-10 rounded-lg px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || !selectedFile || !selectedConversationId}
                className="flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading && <LoaderCircle size={15} className="animate-spin" />}
                {isUploading ? "Saving..." : "Save metadata"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function getFileType(filename: string): DocumentMetadata["file_type"] | null {
  const extension = filename.split(".").pop()?.toLowerCase();
  return ALLOWED_FILE_TYPES.includes(
    extension as (typeof ALLOWED_FILE_TYPES)[number],
  )
    ? (extension as DocumentMetadata["file_type"])
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

function formatDocumentDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
