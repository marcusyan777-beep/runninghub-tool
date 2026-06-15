const $ = (selector) => document.querySelector(selector);
const isStaticMode =
  new URLSearchParams(location.search).get("static") === "1" ||
  !["127.0.0.1", "localhost"].includes(location.hostname);
const directEndpoints = {
  "/api/upload": "https://www.runninghub.cn/openapi/v2/media/upload/binary",
  "/api/run": "https://www.runninghub.ai/openapi/v2/run/ai-app/2060672373740883969",
  "/api/query": "https://www.runninghub.ai/openapi/v2/query",
};

const defaults = {
  duration: "8",
  size: "960",
  maskExpansion: "10",
  jitter: "0.95",
  saveSwitch: false,
};

const state = {
  apiKey: localStorage.getItem("runninghub_api_key") || "",
  history: JSON.parse(localStorage.getItem("runninghub_history") || "[]"),
  pollingTaskId: null,
  imagePreviewUrl: "",
  videoPreviewUrl: "",
  resultPreviewUrls: new Set(),
};

const elements = {
  apiStatus: $("#apiStatus"),
  settingsButton: $("#settingsButton"),
  settingsDialog: $("#settingsDialog"),
  settingsForm: $("#settingsForm"),
  apiKeyInput: $("#apiKeyInput"),
  showApiKey: $("#showApiKey"),
  generatorForm: $("#generatorForm"),
  generateButton: $("#generateButton"),
  generateLabel: $("#generateLabel"),
  formMessage: $("#formMessage"),
  imageInput: $("#imageInput"),
  imageName: $("#imageName"),
  imageDrop: $("#imageDrop"),
  imagePreview: $("#imagePreview"),
  videoInput: $("#videoInput"),
  videoName: $("#videoName"),
  videoDrop: $("#videoDrop"),
  videoPreview: $("#videoPreview"),
  duration: $("#duration"),
  size: $("#size"),
  maskExpansion: $("#maskExpansion"),
  jitter: $("#jitter"),
  jitterValue: $("#jitterValue"),
  saveSwitch: $("#saveSwitch"),
  emptyState: $("#emptyState"),
  taskState: $("#taskState"),
  taskStatus: $("#taskStatus"),
  taskId: $("#taskId"),
  taskDot: $("#taskDot"),
  taskDetail: $("#taskDetail"),
  progressBar: $("#progressBar"),
  results: $("#results"),
  historyList: $("#historyList"),
};

function updateApiStatus() {
  elements.apiStatus.textContent = state.apiKey ? "API Key 已配置" : "尚未配置 API Key";
  elements.apiStatus.classList.toggle("ready", Boolean(state.apiKey));
}

function fileLabel(input, label, card, emptyText) {
  const file = input.files[0];
  label.textContent = file ? `${file.name} · ${formatSize(file.size)}` : emptyText;
  card.classList.toggle("has-file", Boolean(file));
}

function updateInputPreview(kind) {
  const isImage = kind === "image";
  const input = isImage ? elements.imageInput : elements.videoInput;
  const preview = isImage ? elements.imagePreview : elements.videoPreview;
  const stateKey = isImage ? "imagePreviewUrl" : "videoPreviewUrl";
  const file = input.files[0];

  if (state[stateKey]) URL.revokeObjectURL(state[stateKey]);
  state[stateKey] = "";
  preview.replaceChildren();
  preview.classList.toggle("visible", Boolean(file));

  if (!file) return;

  const url = URL.createObjectURL(file);
  state[stateKey] = url;
  const media = isImage ? document.createElement("img") : document.createElement("video");
  media.src = url;
  if (!isImage) {
    media.muted = true;
    media.controls = true;
    media.playsInline = true;
    media.preload = "metadata";
  }
  preview.append(media);
}

function createResultPreviewUrl(blob) {
  const url = URL.createObjectURL(blob);
  state.resultPreviewUrls.add(url);
  return url;
}

function releaseResultPreviewUrl(url) {
  if (!url || !state.resultPreviewUrls.has(url)) return;
  URL.revokeObjectURL(url);
  state.resultPreviewUrls.delete(url);
}

function releaseAllResultPreviews() {
  for (const url of state.resultPreviewUrls) URL.revokeObjectURL(url);
  state.resultPreviewUrls.clear();
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function setBusy(busy, label = "开始生成") {
  elements.generateButton.disabled = busy;
  elements.generateLabel.textContent = label;
}

function showTask(status, detail, progress, mode = "running", taskId = "") {
  elements.emptyState.classList.add("hidden");
  elements.taskState.classList.remove("hidden");
  elements.taskStatus.textContent = status;
  elements.taskDetail.textContent = detail;
  elements.progressBar.style.width = `${progress}%`;
  elements.taskId.textContent = taskId ? `任务 ID：${taskId}` : "";
  elements.taskDot.className = `running-dot ${mode === "running" ? "" : mode}`.trim();
}

async function apiFetch(url, options = {}) {
  const target = isStaticMode && directEndpoints[url] ? directEndpoints[url] : url;
  const response = await fetch(target, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(isStaticMode
        ? { Authorization: `Bearer ${state.apiKey}` }
        : { "X-RunningHub-Api-Key": state.apiKey }),
    },
  });
  const data = await response.json().catch(() => ({}));
  const remoteMessage =
    data.message ||
    data.msg ||
    data.errorMessage ||
    data.error_msg ||
    data.error ||
    data.data?.message ||
    "";
  if (!response.ok) throw new Error(remoteMessage || `请求失败 (${response.status})`);
  if (data.code && data.code !== 0) {
    const detail = remoteMessage ? `：${remoteMessage}` : `，原始响应：${JSON.stringify(data).slice(0, 300)}`;
    throw new Error(`RunningHub 错误码 ${data.code}${detail}`);
  }
  return data;
}

async function uploadFile(file, label) {
  showTask(`正在上传${label}`, `${file.name} · ${formatSize(file.size)}`, 18);
  const formData = new FormData();
  formData.append("file", file);
  const data = await apiFetch("/api/upload", { method: "POST", body: formData });
  const uploaded = data.data || data;
  const fileValue = uploaded.fileName || uploaded.download_url || uploaded.url;
  if (!fileValue) throw new Error(`${label}上传成功，但响应中没有文件地址：${JSON.stringify(data).slice(0, 300)}`);
  return fileValue;
}

function buildRequest(imageValue, videoValue) {
  return {
    nodeInfoList: [
      { nodeId: "95", fieldName: "image", fieldValue: imageValue, description: "Clothing image" },
      { nodeId: "93", fieldName: "video", fieldValue: videoValue, description: "Reference video" },
      { nodeId: "89", fieldName: "value", fieldValue: elements.duration.value, description: "Video duration" },
      { nodeId: "73", fieldName: "value", fieldValue: elements.size.value, description: "Size" },
      { nodeId: "74", fieldName: "value", fieldValue: elements.maskExpansion.value, description: "Mask expansion" },
      { nodeId: "90", fieldName: "strength", fieldValue: elements.jitter.value, description: "Jitter amplitude" },
      { nodeId: "153", fieldName: "value", fieldValue: String(elements.saveSwitch.checked), description: "Save switch" },
    ],
    instanceType: "default",
    usePersonalQueue: false,
  };
}

async function runTask(payload) {
  showTask("正在提交任务", "素材上传完成，正在创建 RunningHub 任务", 45);
  const data = await apiFetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!data.taskId) throw new Error(data.errorMessage || "RunningHub 未返回任务 ID");
  return data;
}

async function pollTask(taskId) {
  state.pollingTaskId = taskId;
  let attempts = 0;

  while (state.pollingTaskId === taskId && attempts < 1440) {
    attempts += 1;
    const data = await apiFetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });

    if (data.status === "SUCCESS") {
      showTask("生成完成", "结果链接有效期为 24 小时，请尽快下载保存。", 100, "done", taskId);
      renderResults(data.results || []);
      saveHistory({ taskId, status: "SUCCESS", results: data.results || [], createdAt: Date.now() });
      state.pollingTaskId = null;
      return data;
    }
    if (data.status === "FAILED") {
      const reason = data.errorMessage || data.failedReason?.message || "任务生成失败";
      showTask("生成失败", reason, 100, "failed", taskId);
      saveHistory({ taskId, status: "FAILED", results: [], createdAt: Date.now(), error: reason });
      state.pollingTaskId = null;
      throw new Error(reason);
    }

    const statusText = data.status === "QUEUED" ? "任务排队中" : "正在生成视频";
    const detail = data.status === "QUEUED" ? "RunningHub 正在分配运行资源" : "生成通常需要几分钟，请保持页面开启";
    showTask(statusText, detail, data.status === "QUEUED" ? 55 : Math.min(92, 62 + attempts / 3), "running", taskId);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("任务查询超时，可稍后从历史记录继续查询");
}

function renderResults(results) {
  releaseAllResultPreviews();
  elements.results.innerHTML = "";
  if (!results.length) {
    elements.results.innerHTML = '<p class="form-message">任务成功，但没有返回可展示的结果。</p>';
    return;
  }

  for (const result of results) {
    const card = document.createElement("div");
    card.className = "result-card";
    const type = (result.outputType || "").toLowerCase();
    const filename = result.url ? decodeURIComponent(result.url.split("/").pop().split("?")[0]) : "";
    if (result.text) {
      const pre = document.createElement("pre");
      pre.className = "text-result";
      pre.textContent = result.text;
      card.append(pre);
    } else if (result.url && ["mp4", "webm", "mov"].includes(type)) {
      const video = document.createElement("video");
      video.src = result.url;
      video.controls = true;
      video.playsInline = true;
      card.append(video);
    } else if (result.url && ["png", "jpg", "jpeg", "webp", "gif"].includes(type)) {
      const image = document.createElement("img");
      image.src = result.url;
      image.alt = "RunningHub 生成结果";
      card.append(image);
    } else if (result.url) {
      const file = document.createElement("div");
      file.className = "file-result";
      const icon = document.createElement("span");
      icon.className = "file-icon";
      icon.textContent = type === "zip" ? "ZIP" : (type || "FILE").toUpperCase();
      const info = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = filename || `RunningHub 结果.${type}`;
      const hint = document.createElement("small");
      hint.textContent = type === "zip"
        ? "本次结果为压缩包，会自动在线解压；解压后页面只保留可预览文件。"
        : "该文件无法在网页中直接预览，请下载后查看。";
      info.append(title, hint);
      file.append(icon, info);
      card.append(file);
      if (type === "zip") {
        const unpackArea = document.createElement("div");
        unpackArea.className = "unpack-area";
        const unpackButton = document.createElement("button");
        unpackButton.type = "button";
        unpackButton.className = "secondary unpack-button";
        unpackButton.textContent = "在线解压并预览";
        unpackButton.addEventListener("click", async () => {
          unpackButton.disabled = true;
          unpackButton.textContent = "正在解压...";
          try {
            const unpacked = isStaticMode
              ? await extractZipInBrowser(result.url)
              : await apiFetch("/api/extract-zip", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: result.url }),
                });
            unpackArea.innerHTML = "";
            renderExtractedFiles(unpackArea, unpacked.files || []);
            file.remove();
            elements.taskDetail.textContent = "ZIP 已解压，可以直接预览和保存视频。";
          } catch (error) {
            unpackButton.disabled = false;
            unpackButton.textContent = "重新解压";
            elements.taskDetail.textContent = `解压失败：${error.message}`;
          }
        });
        unpackArea.append(unpackButton);
        card.append(unpackArea);
        unpackButton.click();
      }
    }

    if (result.url && type !== "zip") {
      const actions = document.createElement("div");
      actions.className = "result-actions";
      const preview = document.createElement("a");
      preview.href = result.url;
      preview.target = "_blank";
      preview.rel = "noreferrer";
      preview.textContent = "打开原文件";
      const download = document.createElement("a");
      download.href = "#";
      download.textContent = isStaticMode
        ? (type === "zip" ? "保存或分享 ZIP" : "保存或分享")
        : (type === "zip" ? "保存 ZIP 到电脑" : "保存到电脑");
      download.addEventListener("click", async (event) => {
        event.preventDefault();
        const originalText = download.textContent;
        download.textContent = "正在保存...";
        download.classList.add("disabled");
        try {
          if (isStaticMode) {
            const response = await fetch(result.url);
            if (!response.ok) throw new Error("无法读取结果文件");
            const blob = await response.blob();
            await shareOrDownload(blob, filename || `runninghub-result.${type || "bin"}`);
            elements.taskDetail.textContent = "已打开 iPhone 保存菜单，可存入“文件”或分享。";
          } else {
            const saved = await apiFetch("/api/save-result", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: result.url }),
            });
            elements.taskDetail.textContent = `已保存到：${saved.filePath}`;
          }
          download.textContent = "已保存";
        } catch (error) {
          elements.taskDetail.textContent = `保存失败：${error.message}`;
          download.textContent = originalText;
        } finally {
          download.classList.remove("disabled");
        }
      });
      actions.append(preview, download);
      card.append(actions);
    }
    elements.results.append(card);
  }
}

function renderExtractedFiles(container, files) {
  for (const file of files) {
    const mediaCard = document.createElement("div");
    mediaCard.className = "extracted-media";
    if (["mp4", "webm", "mov"].includes(file.type)) {
      const video = document.createElement("video");
      video.src = file.previewUrl;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      mediaCard.append(video);
    } else {
      const image = document.createElement("img");
      image.src = file.previewUrl;
      image.alt = file.name;
      mediaCard.append(image);
    }

    const meta = document.createElement("div");
    meta.className = "extracted-meta";
    const name = document.createElement("span");
    name.textContent = `${file.name} · ${formatSize(file.size)}`;
    const buttons = document.createElement("div");
    buttons.className = "extracted-actions";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "primary save-media";
    const isVideo = ["mp4", "webm", "mov"].includes(file.type);
    save.textContent = isStaticMode
      ? (isVideo ? "保存或分享视频" : "保存或分享图片")
      : (isVideo ? "保存视频到电脑" : "保存图片到电脑");
    save.addEventListener("click", async () => {
      save.disabled = true;
      save.textContent = "正在保存...";
      try {
        if (isStaticMode) {
          await shareOrDownload(file.blob, file.name);
          save.textContent = "已打开保存菜单";
          elements.taskDetail.textContent = "请选择“存储到文件”或其他分享目标。";
          return;
        }
        const saved = await apiFetch("/api/save-extracted", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: file.token, filename: file.name }),
        });
        save.textContent = "已保存";
        elements.taskDetail.textContent = `已保存到：${saved.filePath}`;
      } catch (error) {
        save.disabled = false;
        save.textContent = "重新保存";
        elements.taskDetail.textContent = `保存失败：${error.message}`;
      }
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary delete-media";
    remove.textContent = isVideo ? "删除视频预览" : "删除图片预览";
    remove.addEventListener("click", () => {
      releaseResultPreviewUrl(file.previewUrl);
      mediaCard.remove();
      elements.taskDetail.textContent = isVideo
        ? "已删除当前视频预览，内存会由浏览器回收。"
        : "已删除当前图片预览，内存会由浏览器回收。";
    });
    buttons.append(save, remove);
    meta.append(name, buttons);
    mediaCard.append(meta);
    container.append(mediaCard);
  }
}

async function extractZipInBrowser(url) {
  if (!globalThis.fflate) throw new Error("ZIP 解压组件加载失败，请检查网络后刷新");
  const response = await fetch(url);
  if (!response.ok) throw new Error("无法下载 ZIP 结果");
  const buffer = new Uint8Array(await response.arrayBuffer());
  const unzipped = globalThis.fflate.unzipSync(buffer);
  const allowed = new Set(["mp4", "webm", "mov", "png", "jpg", "jpeg", "webp", "gif"]);
  const mimeTypes = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };
  const files = [];
  let totalSize = 0;

  for (const [path, bytes] of Object.entries(unzipped)) {
    const name = path.split("/").pop();
    const type = (name.split(".").pop() || "").toLowerCase();
    if (!name || !allowed.has(type)) continue;
    totalSize += bytes.byteLength;
    if (totalSize > 1024 * 1024 * 1024) throw new Error("解压结果超过 1 GB");
    const blob = new Blob([bytes], { type: mimeTypes[type] || "application/octet-stream" });
    files.push({
      name,
      type,
      size: blob.size,
      blob,
      previewUrl: createResultPreviewUrl(blob),
      token: "",
    });
  }
  if (!files.length) throw new Error("ZIP 中没有可预览的图片或视频");
  return { files };
}

async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

function saveHistory(item) {
  state.history = [item, ...state.history.filter((entry) => entry.taskId !== item.taskId)].slice(0, 10);
  localStorage.setItem("runninghub_history", JSON.stringify(state.history));
  renderHistory();
}

function historyLabel(item) {
  if (item.status === "SUCCESS") return "生成成功";
  if (item.status === "FAILED") return "生成失败";
  if (item.status === "QUEUED") return "排队中";
  return "生成中";
}

function historyAction(item) {
  if (item.status === "SUCCESS") return "查看";
  if (item.status === "FAILED") return "重查";
  return "继续查";
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  if (!state.history.length) {
    elements.historyList.innerHTML = '<div class="history-empty">暂无历史任务</div>';
    return;
  }
  for (const item of state.history) {
    const row = document.createElement("div");
    row.className = "history-item";
    const info = document.createElement("div");
    const date = new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false });
    info.innerHTML = `<strong>${historyLabel(item)}</strong><br><span>${date}</span>`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = historyAction(item);
    button.addEventListener("click", async () => {
      if (item.status === "SUCCESS") {
        showTask("历史结果", "RunningHub 结果链接仅保留 24 小时。", 100, "done", item.taskId);
        renderResults(item.results || []);
      } else if (state.apiKey) {
        elements.results.innerHTML = "";
        await pollTask(item.taskId).catch((error) => {
          elements.formMessage.textContent = error.message;
        });
      }
    });
    row.append(info, button);
    elements.historyList.append(row);
  }
}

elements.settingsButton.addEventListener("click", () => {
  elements.apiKeyInput.value = state.apiKey;
  elements.settingsDialog.showModal();
});

elements.settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.apiKey = elements.apiKeyInput.value.trim();
  if (state.apiKey) localStorage.setItem("runninghub_api_key", state.apiKey);
  else localStorage.removeItem("runninghub_api_key");
  updateApiStatus();
  elements.settingsDialog.close();
});

elements.showApiKey.addEventListener("change", () => {
  elements.apiKeyInput.type = elements.showApiKey.checked ? "text" : "password";
});

elements.imageInput.addEventListener("change", () => {
  fileLabel(elements.imageInput, elements.imageName, elements.imageDrop, "点击选择图片");
  updateInputPreview("image");
});
elements.videoInput.addEventListener("change", () => {
  fileLabel(elements.videoInput, elements.videoName, elements.videoDrop, "点击选择视频");
  updateInputPreview("video");
});
elements.jitter.addEventListener("input", () => { elements.jitterValue.value = Number(elements.jitter.value).toFixed(2); });

$("#resetButton").addEventListener("click", () => {
  for (const [key, value] of Object.entries(defaults)) elements[key][typeof value === "boolean" ? "checked" : "value"] = value;
  elements.jitterValue.value = defaults.jitter;
});

$("#clearHistory").addEventListener("click", () => {
  state.history = [];
  localStorage.removeItem("runninghub_history");
  renderHistory();
});

elements.generatorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.formMessage.textContent = "";
  elements.results.innerHTML = "";

  if (!state.apiKey) {
    elements.settingsDialog.showModal();
    elements.formMessage.textContent = "请先配置 RunningHub API Key";
    return;
  }

  const image = elements.imageInput.files[0];
  const video = elements.videoInput.files[0];
  if (!image || !video) return;

  try {
    setBusy(true, "正在处理...");
    const imageValue = await uploadFile(image, "服装图片");
    const videoValue = await uploadFile(video, "参考视频");
    const task = await runTask(buildRequest(imageValue, videoValue));
    saveHistory({ taskId: task.taskId, status: task.status || "RUNNING", results: [], createdAt: Date.now() });
    await pollTask(task.taskId);
  } catch (error) {
    elements.formMessage.textContent = error.message;
    if (!state.pollingTaskId) showTask("处理失败", error.message, 100, "failed");
  } finally {
    setBusy(false);
  }
});

updateApiStatus();
renderHistory();

if ("serviceWorker" in navigator && isStaticMode) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
