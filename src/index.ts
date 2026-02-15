import { Env, ChatMessage } from "./types";

const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext,
    ): Promise<Response> {
        const url = new URL(request.url);

        // Handle frontend assets
        if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
            return env.ASSETS.fetch(request);
        }

        // API Route
        if (url.pathname === "/api/chat" && request.method === "POST") {
            return handleChatRequest(request, env);
        }

        return new Response("Not found", { status: 404 });
    },
} satisfies ExportedHandler<Env>;

async function handleChatRequest(
    request: Request,
    env: Env,
): Promise<Response> {
    try {
        const { messages = [] } = (await request.json()) as {
            messages: ChatMessage[];
        };

        // 1. Fetch marketing facts from KV
        const authPilotFacts = await env.KNOWLEDGE_BASE.get("authpilot_docs") || "AuthPilot: AI-driven Prior Authorization.";

        // 2. Build the dynamic prompt
        const dynamicPrompt = `${env.SYSTEM_PROMPT}\n\nCONTEXT:\n${authPilotFacts}`;

        // 3. Ensure system prompt is at the top
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
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Build Error" }), { status: 500 });
    }
}