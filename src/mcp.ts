#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { extract } from "./index.js";

const server = new Server(
  { name: "web-extract", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "extract",
      description:
        "Fetch a URL and return clean Markdown plus structured metadata. " +
        "Token-budgeted for direct use in agent context. Supports HTML articles and GitHub repos.",
      inputSchema: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", description: "URL to extract" },
          maxTokens: {
            type: "integer",
            description: "Trim markdown to fit this token budget (default 8000)",
          },
          includeImages: { type: "boolean", default: true },
          includeLinks: { type: "boolean", default: false },
          useBrowser: {
            type: "string",
            enum: ["never", "auto", "always"],
            default: "never",
            description: "Use a headless Playwright browser. 'auto' falls back when the page looks JS-rendered.",
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== "extract") {
    throw new Error(`unknown tool: ${req.params.name}`);
  }
  const args = req.params.arguments as { url?: string; [k: string]: unknown };
  if (!args?.url || typeof args.url !== "string") {
    throw new Error("url is required");
  }
  const ub = args.useBrowser;
  const result = await extract(args.url, {
    maxTokens: typeof args.maxTokens === "number" ? args.maxTokens : undefined,
    includeImages: typeof args.includeImages === "boolean" ? args.includeImages : undefined,
    includeLinks: typeof args.includeLinks === "boolean" ? args.includeLinks : undefined,
    useBrowser: ub === "auto" || ub === "always" || ub === "never" ? ub : undefined,
  });
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
