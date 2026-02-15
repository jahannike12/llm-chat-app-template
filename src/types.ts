/**
 * Type definitions for the LLM chat application.
 */

export interface Env {
    /**
     * Binding for the Workers AI API.
     */
    AI: any;

    /**
     * Binding for static assets.
     */
    ASSETS: { fetch: (request: Request) => Promise<Response> };

    /**
     * Environment variable for the system instructions.
     */
    SYSTEM_PROMPT: string;

    /**
     * Binding for the AuthPilot knowledge base.
     */
    KNOWLEDGE_BASE: KVNamespace;
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}