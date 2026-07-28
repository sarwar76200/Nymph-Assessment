import { createContext } from "react";

export type Conversation = {
    id: string;
    organization_id: string;
    created_by_user_id: string | null;
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
    touchConversation: (conversationId: string, updatedAt: string) => void;
    promoteConversation: (conversation: Conversation) => void;
    totalMessages: number | null;
    messageCountRevision: number;
    incrementMessageCount: (amount: number) => void;
};

export const ConversationContext = createContext<ConversationContextValue | null>(null);