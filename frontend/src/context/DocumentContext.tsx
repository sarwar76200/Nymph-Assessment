import { createContext } from "react";

export type DocumentMetadata = {
    id: string;
    conversation_id: string;
    uploaded_by_user_id: string | null;
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

export const DocumentContext = createContext<DocumentContextValue | null>(null);