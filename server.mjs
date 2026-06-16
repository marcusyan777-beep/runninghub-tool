import { copyFileSync, createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { basename, extname, join, normalize, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const RUNNINGHUB_API = "https://www.runninghub.ai";
const RUNNINGHUB_UPLOAD = "https://www.runninghub.cn/openapi/v2/media/upload/binary";
const DEFAULT_APP_ID = "2060672373740883969";
const CACHE_ROOT = join(ROOT, ".cache", "extracted");
const execFileAsync = promisify(execFile);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
};

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function getApiKey(req) {
  const apiKey = req.headers["x-runninghub-api-key"];
  return typeof apiKey === "string" ? apiKey.trim() : "";
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function proxyJson(req, res, path) {
  const apiKey = getApiKey(req);
  if (!apiKey) return json(res, 401, { message: "缺少 RunningHub API Key" });

  const body = await readBody(req);
  const upstream = await fetch(`${RUNNINGHUB_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body,
  });

  const text = await upstream.text();
  res.writeHead(upstream.status, {
    "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(text);
}

async function proxyUpload(req, res) {
  const apiKey = getApiKey(req);
  if (!apiKey) return json(res, 401, { message: "缺少 RunningHub API Key" });

  const upstream = await fetch(RUNNINGHUB_UPLOAD, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": req.headers["content-type"],
    },
    body: req,
    duplex: "half",
  });

  const text = await upstream.text();
  res.writeHead(upstream.status, {
    "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(text);
}

async function downloadResult(req, res, urlValue) {
  let target;
  try {
    target = new URL(urlValue);
  } catch {
    return json(res, 400, { message: "结果地址无效" });
  }

  const allowed =
    target.protocol === "https:" &&
    ["myqcloud.com", "runninghub.ai", "runninghub.cn"].some(
      (domain) => target.hostname === domain || target.hostname.endsWith(`.${domain}`),
    );
  if (!allowed) return json(res, 400, { message: "不允许下载该地址" });

  const upstream = await fetch(target, {
    method: req.method === "HEAD" ? "HEAD" : "GET",
  });
  if (!upstream.ok || !upstream.body) {
    if (req.method === "HEAD" && upstream.ok) {
      const filename = target.pathname.split("/").pop() || "runninghub-result";
      const headers = {
        "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      };
      const contentLength = upstream.headers.get("content-length");
      if (contentLength) headers["Content-Length"] = contentLength;
      res.writeHead(200, headers);
      return res.end();
    }
    return json(res, upstream.status || 502, { message: "结果文件下载失败" });
  }

  const filename = target.pathname.split("/").pop() || "runninghub-result";
  const headers = {
    "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "private, no-store",
  };
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers["Content-Length"] = contentLength;
  res.writeHead(200, headers);
  for await (const chunk of upstream.body) res.write(chunk);
  res.end();
}

function parseAllowedResultUrl(urlValue) {
  let target;
  try {
    target = new URL(urlValue);
  } catch {
    return null;
  }

  const allowed =
    target.protocol === "https:" &&
    ["myqcloud.com", "runninghub.ai", "runninghub.cn"].some(
      (domain) => target.hostname === domain || target.hostname.endsWith(`.${domain}`),
    );
  return allowed ? target : null;
}

async function saveResultToDownloads(req, res) {
  const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
  const target = parseAllowedResultUrl(body.url);
  if (!target) return json(res, 400, { message: "结果地址无效或不受支持" });

  const upstream = await fetch(target);
  if (!upstream.ok || !upstream.body) {
    return json(res, upstream.status || 502, { message: "无法读取 RunningHub 结果文件" });
  }

  const rawName = decodeURIComponent(target.pathname.split("/").pop() || "runninghub-result");
  const filename = rawName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  const downloadDirectory = join(homedir(), "Downloads", "RunningHub");
  mkdirSync(downloadDirectory, { recursive: true });

  let filePath = join(downloadDirectory, filename);
  if (existsSync(filePath)) {
    const extension = extname(filename);
    const stem = filename.slice(0, filename.length - extension.length);
    filePath = join(downloadDirectory, `${stem}-${Date.now()}${extension}`);
  }

  await pipeline(upstream.body, createWriteStream(filePath));
  return json(res, 200, {
    message: "文件已保存",
    filePath,
    filename: filePath.split(/[\\/]/).pop(),
    size: statSync(filePath).size,
  });
}

function safeFileName(value) {
  return basename(value).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

async function extractZipForPreview(req, res) {
  const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
  const target = parseAllowedResultUrl(body.url);
  if (!target || extname(target.pathname).toLowerCase() !== ".zip") {
    return json(res, 400, { message: "仅支持 RunningHub 返回的 ZIP 文件" });
  }

  const upstream = await fetch(target);
  if (!upstream.ok || !upstream.body) {
    return json(res, upstream.status || 502, { message: "无法读取 ZIP 文件" });
  }

  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (contentLength > 1024 * 1024 * 1024) {
    return json(res, 413, { message: "ZIP 文件超过 1 GB，无法在线解压" });
  }

  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const extractDirectory = join(CACHE_ROOT, token);
  const zipPath = join(extractDirectory, "result.zip");
  mkdirSync(extractDirectory, { recursive: true });
  await pipeline(upstream.body, createWriteStream(zipPath));

  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    join(ROOT, "scripts", "extract-media.ps1"),
    zipPath,
    extractDirectory,
  ], { windowsHide: true, timeout: 120000 });

  const files = readdirSync(extractDirectory)
    .filter((name) => name !== "result.zip")
    .map((name) => {
      const filePath = join(extractDirectory, name);
      return {
        name,
        size: statSync(filePath).size,
        type: extname(name).slice(1).toLowerCase(),
        previewUrl: `/media/${encodeURIComponent(token)}/${encodeURIComponent(name)}`,
        token,
      };
    });

  if (!files.length) {
    return json(res, 422, { message: "ZIP 中没有可预览的图片或视频" });
  }
  return json(res, 200, { files });
}

function serveExtractedMedia(req, res, pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 3 || parts[0] !== "media") return json(res, 404, { message: "文件不存在" });

  const token = safeFileName(decodeURIComponent(parts[1]));
  const filename = safeFileName(decodeURIComponent(parts[2]));
  const cacheDirectory = resolve(CACHE_ROOT, token);
  const filePath = resolve(cacheDirectory, filename);
  if (!filePath.startsWith(`${cacheDirectory}\\`) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    return json(res, 404, { message: "预览文件不存在" });
  }

  const size = statSync(filePath).size;
  const range = req.headers.range;
  const contentType = mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream";
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) return json(res, 416, { message: "无效的范围请求" });
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start > end || start >= size) return json(res, 416, { message: "请求范围超出文件大小" });
    res.writeHead(206, {
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": end - start + 1,
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    });
    return createReadStream(filePath, { start, end }).pipe(res);
  }

  res.writeHead(200, {
    "Accept-Ranges": "bytes",
    "Content-Length": size,
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=3600",
  });
  return createReadStream(filePath).pipe(res);
}

async function saveExtractedMedia(req, res) {
  const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
  const token = safeFileName(String(body.token || ""));
  const filename = safeFileName(String(body.filename || ""));
  const cacheDirectory = resolve(CACHE_ROOT, token);
  const source = resolve(cacheDirectory, filename);
  if (!token || !filename || !source.startsWith(`${cacheDirectory}\\`) || !existsSync(source)) {
    return json(res, 404, { message: "解压后的视频不存在" });
  }

  const downloadDirectory = join(homedir(), "Downloads", "RunningHub");
  mkdirSync(downloadDirectory, { recursive: true });
  let destination = join(downloadDirectory, filename);
  if (existsSync(destination)) {
    const extension = extname(filename);
    const stem = filename.slice(0, filename.length - extension.length);
    destination = join(downloadDirectory, `${stem}-${Date.now()}${extension}`);
  }
  copyFileSync(source, destination);
  return json(res, 200, { message: "视频已保存", filePath: destination, size: statSync(destination).size });
}

function serveStatic(req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(ROOT, "public", safePath);

  if (!filePath.startsWith(join(ROOT, "public")) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    return json(res, 404, { message: "页面不存在" });
  }

  res.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "POST" && url.pathname === "/api/upload") {
      return await proxyUpload(req, res);
    }
    if (req.method === "POST" && (url.pathname === "/api/run" || url.pathname.startsWith("/api/run/"))) {
      const appId = url.pathname.split("/").pop() || DEFAULT_APP_ID;
      if (!/^\d{10,}$/.test(appId)) return json(res, 400, { message: "AI 应用 ID 无效" });
      return await proxyJson(req, res, `/openapi/v2/run/ai-app/${appId}`);
    }
    if (req.method === "POST" && url.pathname === "/api/query") {
      return await proxyJson(req, res, "/openapi/v2/query");
    }
    if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/api/download") {
      return await downloadResult(req, res, url.searchParams.get("url") || "");
    }
    if (req.method === "POST" && url.pathname === "/api/save-result") {
      return await saveResultToDownloads(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/extract-zip") {
      return await extractZipForPreview(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/save-extracted") {
      return await saveExtractedMedia(req, res);
    }
    if (req.method === "GET" && url.pathname.startsWith("/media/")) {
      return serveExtractedMedia(req, res, url.pathname);
    }
    if (req.method === "GET") return serveStatic(req, res);

    return json(res, 405, { message: "不支持的请求方式" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { message: error.message || "服务器发生错误" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`RunningHub Launcher: http://127.0.0.1:${PORT}`);
});
