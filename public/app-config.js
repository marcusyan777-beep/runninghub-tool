export const runningHubApp = {
  id: "2060672373740883969",
  name: "视频换装加抖动",
  endpoints: {
    upload: "https://www.runninghub.cn/openapi/v2/media/upload/binary",
    run: "https://www.runninghub.ai/openapi/v2/run/ai-app/2060672373740883969",
    query: "https://www.runninghub.ai/openapi/v2/query",
  },
  nodes: {
    clothingImage: { nodeId: "95", fieldName: "image", description: "Clothing image" },
    referenceVideo: { nodeId: "93", fieldName: "video", description: "Reference video" },
    duration: { nodeId: "89", fieldName: "value", description: "Video duration" },
    size: { nodeId: "73", fieldName: "value", description: "Size" },
    maskExpansion: { nodeId: "74", fieldName: "value", description: "Mask expansion" },
    jitter: { nodeId: "90", fieldName: "strength", description: "Jitter amplitude" },
    saveSwitch: { nodeId: "153", fieldName: "value", description: "Save switch" },
  },
};

export const fileLimits = {
  imageBytes: 20 * 1024 * 1024,
  videoBytes: 250 * 1024 * 1024,
  extractedBytes: 1024 * 1024 * 1024,
  resultUrlTtlMs: 24 * 60 * 60 * 1000,
};
