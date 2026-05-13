import { spawn } from "node:child_process";

const proc = spawn(process.execPath, ["./dist/mcp.js"], {
  stdio: ["pipe", "pipe", "inherit"],
});

let buf = "";
const pending = new Map();
proc.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    const r = pending.get(msg.id);
    if (r) {
      pending.delete(msg.id);
      r(msg);
    }
  }
});

let nextId = 1;
function send(method, params) {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

await send("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "smoke", version: "0" },
});
proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

const tools = await send("tools/list", {});
console.log("tools:", tools.result.tools.map((t) => t.name));

const call = await send("tools/call", {
  name: "extract",
  arguments: { url: "https://github.com/nkpatnis/timeahead-mcp", maxTokens: 300 },
});
const payload = JSON.parse(call.result.content[0].text);
console.log({
  contentType: payload.contentType,
  title: payload.title,
  tokenCount: payload.tokenCount,
  preview: payload.markdown.slice(0, 120),
});

proc.kill();
