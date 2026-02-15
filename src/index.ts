/**
 * AuthPilot Solution Chat Agent
 * * This Worker uses environment variables for instructions and 
 * Cloudflare KV for the product knowledge base.
 */
import { Env, ChatMessage } from "./types";

const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";

export default {
    /**
     * Main request handler for the Worker
     */
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext,
    ): Promise<Response> {
        const url = new URL(request.url);

        // Handle static assets (frontend)
        if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
            return env.ASSETS.fetch(request);
        }

        // API Routes
        if (url.pathname === "/api/chat") {
            if (request.method === "POST") {
                return handleChatRequest(request, env);
            }
            return new Response("Method not allowed", { status: 405 });
        }

        return new Response("Not found", { status: 404 });
    },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests with dynamic grounding
 */
async function handleChatRequest(
    request: Request,
    env: Env,
): Promise<Response> {
    try {
        const { messages = [] } = (await request.json()) as {
            messages: ChatMessage[];
        };

        // 1. Fetch facts from your Knowledge Base (KV)
        const authPilotFacts = await env.KNOWLEDGE_BASE.get("authpilot_docs") || "No specific facts found.";

        // 2. Combine the Instruction (from Env Vars) with the Facts (from KV)
        // This ensures the AI is grounded in the AuthPilot context
        const dynamicPrompt = `${env.SYSTEM_PROMPT}\n\nRELEVANT AUTHPILOT FACTS:\n${authPilotFacts}`;

        // 3. Inject this system prompt if it's a new conversation
        if (!messages.some((msg) => msg.role === "system")) {
            messages.unshift({ role: "system", content: dynamicPrompt });
        }

        const stream = await env.AI.run(MODEL_ID, {
            messages,
            max_tokens: 1024,
            stream: true,
        });

        return new Response(stream, {
            headers: {
                "content-type": "text/event-stream; charset=utf-8",
                "cache-control": "no-cache",
                "connection": "keep-alive",
            },
        });
    } catch (error) {
        console.error("Error processing chat request:", error);
        return new Response(
            JSON.stringify({ error: "Failed to process request" }),
            {
                status: 500,
                headers: { "content-type": "application/json" },
            }
        );
    }
}