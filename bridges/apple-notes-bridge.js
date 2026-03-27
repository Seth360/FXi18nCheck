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
  const screenshots = normalizeScreenshotsPayload(payload);
  const archive = await saveArchiveArtifacts(title, body, archiveDir, screenshots);

  await createAppleNote({
    title,
    folder,
    body,
    screenshotPaths: archive.screenshotPaths
  });

  return {
    message: "已写入备忘录并生成本地归档",
    noteLocation: `备忘录 / ${folder} / ${title}`,
    archivePath: archive.markdownPath,
    screenshotPath: archive.screenshotPaths[0] || "",
    screenshotPaths: archive.screenshotPaths
  };
}

async function saveArchiveArtifacts(title, body, archiveDir, screenshots) {
  const safeTitle = sanitizeFileName(title);
  const fullDir = path.resolve(archiveDir);
  await fs.promises.mkdir(fullDir, { recursive: true });
  const markdownPath = path.join(fullDir, `${safeTitle}.md`);
  await fs.promises.writeFile(markdownPath, body, "utf8");

  const screenshotPaths = [];
  for (const screenshot of Array.isArray(screenshots) ? screenshots : []) {
    const imageBuffer = decodeDataUrlToBuffer(screenshot.dataUrl);
    const defaultName = `${safeTitle}-screenshot-${String(screenshotPaths.length + 1).padStart(2, "0")}${getScreenshotExtension(screenshot.dataUrl)}`;
    const imageName = sanitizeFileName(screenshot.filename || defaultName);
    const finalName = hasSupportedImageExtension(imageName) ? imageName : `${imageName}${getScreenshotExtension(screenshot.dataUrl)}`;
    const screenshotPath = path.join(fullDir, finalName);
    await fs.promises.writeFile(screenshotPath, imageBuffer);
    screenshotPaths.push(screenshotPath);
  }

  return {
    markdownPath,
    screenshotPaths
  };
}

function createAppleNote(payload) {
  const title = escapeForAppleScript(payload.title);
  const folder = escapeForAppleScript(payload.folder);
  const body = escapeForAppleScript(payload.body);
  const screenshotPaths = (Array.isArray(payload.screenshotPaths) ? payload.screenshotPaths : []).map(escapeForAppleScript);

  const script = [
    "tell application \"Notes\"",
    `set targetFolderName to "${folder}"`,
    "set targetAccount to first account",
    "try",
    "set targetFolder to folder targetFolderName of targetAccount",
    "on error",
    "set targetFolder to make new folder at targetAccount with properties {name:targetFolderName}",
    "end try",
    `set newNote to make new note at targetFolder with properties {name:"${title}", body:"${body}"}`,
    ...screenshotPaths.map((screenshotPath) => `make new attachment at newNote with data (POSIX file "${screenshotPath}")`),
    "end tell"
  ].filter(Boolean).join("\n");

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

function normalizeScreenshotPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const dataUrl = String(payload.dataUrl || "").trim();
  if (!dataUrl.startsWith("data:image/")) {
    return null;
  }
  return {
    filename: String(payload.filename || "").trim(),
    dataUrl
  };
}

function normalizeScreenshotsPayload(payload) {
  const result = [];
  const singleScreenshot = normalizeScreenshotPayload(payload.screenshot);
  if (singleScreenshot) {
    result.push(singleScreenshot);
  }
  for (const item of Array.isArray(payload.screenshots) ? payload.screenshots : []) {
    const normalized = normalizeScreenshotPayload(item);
    if (normalized) {
      result.push(normalized);
    }
  }
  return result;
}

function decodeDataUrlToBuffer(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("截图数据格式不正确");
  }
  return Buffer.from(match[2], "base64");
}

function getScreenshotExtension(dataUrl) {
  const mimeType = String(dataUrl || "").match(/^data:([^;]+);base64,/i)?.[1] || "";
  if (/png/i.test(mimeType)) {
    return ".png";
  }
  if (/webp/i.test(mimeType)) {
    return ".webp";
  }
  return ".jpg";
}

function hasSupportedImageExtension(fileName) {
  return /\.(png|jpg|jpeg|webp)$/i.test(String(fileName || ""));
}

function escapeForAppleScript(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\n/g, "<br>");
}
