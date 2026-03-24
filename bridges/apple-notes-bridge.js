const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { execFile } = require("child_process");

const port = Number(process.env.APPLE_NOTES_BRIDGE_PORT || 3894);

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/note") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Not found" }));
    return;
  }

  readJsonBody(req)
    .then(handleNoteRequest)
    .then((result) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, ...result }));
    })
    .catch((error) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: error.message }));
    });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Apple Notes bridge listening on http://127.0.0.1:${port}/note`);
});

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const json = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        resolve(json);
      } catch (_error) {
        reject(new Error("请求体不是合法 JSON"));
      }
    });
    req.on("error", reject);
  });
}

async function handleNoteRequest(payload) {
  const title = String(payload.title || "多语质检报告");
  const folder = String(payload.folder || "多语质检");
  const body = String(payload.body || "");
  const archiveDir = expandHomeDir(String(payload.archiveDir || "~/Documents/Multilingual-QA-Reports"));
  const archivePath = await saveArchiveFile(title, body, archiveDir);

  await createAppleNote({
    title,
    folder,
    body
  });

  return {
    message: "已写入备忘录并生成本地归档",
    noteLocation: `备忘录 / ${folder} / ${title}`,
    archivePath
  };
}

async function saveArchiveFile(title, body, archiveDir) {
  const safeTitle = sanitizeFileName(title);
  const fullDir = path.resolve(archiveDir);
  await fs.promises.mkdir(fullDir, { recursive: true });
  const archivePath = path.join(fullDir, `${safeTitle}.md`);
  await fs.promises.writeFile(archivePath, body, "utf8");
  return archivePath;
}

function createAppleNote(payload) {
  const title = escapeForAppleScript(payload.title);
  const folder = escapeForAppleScript(payload.folder);
  const body = escapeForAppleScript(payload.body);

  const script = [
    "tell application \"Notes\"",
    `set targetFolderName to "${folder}"`,
    "set targetAccount to first account",
    "try",
    "set targetFolder to folder targetFolderName of targetAccount",
    "on error",
    "set targetFolder to make new folder at targetAccount with properties {name:targetFolderName}",
    "end try",
    `make new note at targetFolder with properties {name:"${title}", body:"${body}"}`,
    "end tell"
  ].join("\n");

  return new Promise((resolve, reject) => {
    execFile("osascript", ["-e", script], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

function expandHomeDir(input) {
  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

function sanitizeFileName(input) {
  return String(input).replace(/[\\/:*?"<>|]/g, "_").slice(0, 120);
}

function escapeForAppleScript(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\n/g, "<br>");
}
