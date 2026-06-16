const uploadEndpoint = "https://www.runninghub.cn/openapi/v2/media/upload/binary";
const queryEndpoint = "https://www.runninghub.ai/openapi/v2/query";

export const runningHubApps = [
  {
    id: "2060672373740883969",
    key: "clothing-video-jitter",
    name: "视频换装加抖动",
    category: "视频换装",
    description: "上传服装图片和参考视频，调整参数后直接提交到 RunningHub。",
    inputs: { image: "服装图片", video: "参考视频" },
    fields: ["duration", "size", "maskExpansion", "jitter", "saveSwitch"],
    defaults: {
      duration: "8",
      size: "960",
      maskExpansion: "10",
      jitter: "0.95",
      saveSwitch: false,
    },
    endpoints: {
      upload: uploadEndpoint,
      run: "https://www.runninghub.ai/openapi/v2/run/ai-app/2060672373740883969",
      query: queryEndpoint,
    },
    nodes: {
      image: { nodeId: "95", fieldName: "image", description: "Clothing image" },
      video: { nodeId: "93", fieldName: "video", description: "Reference video" },
      duration: { nodeId: "89", fieldName: "value", description: "Video duration" },
      size: { nodeId: "73", fieldName: "value", description: "Size" },
      maskExpansion: { nodeId: "74", fieldName: "value", description: "Mask expansion" },
      jitter: { nodeId: "90", fieldName: "strength", description: "Jitter amplitude" },
      saveSwitch: { nodeId: "153", fieldName: "value", description: "Save switch" },
    },
  },
  {
    id: "2060339430623367169",
    key: "smooth-image-to-video",
    name: "Smooth图生视频",
    category: "图生视频",
    description: "上传参考图片，填写提示词、宽高和时长后生成 Smooth 图生视频。",
    inputs: { image: "参考图片" },
    fields: ["width", "height", "duration", "prompt", "saveSwitch"],
    defaults: {
      width: "420",
      height: "832",
      duration: "5",
      prompt: "一位可爱的年轻亚洲女性，留着深棕色双马尾长发，身穿米白色毛绒短款外套与同材质蓬松短裙，内搭白色上衣并系有黑色小蝴蝶结，搭配黑色丝袜与黑色皮鞋，手持黑色长柄雨伞，站在充满万圣节氛围的街头市集。她微微侧身，左腿轻抬，面带甜美微笑直视镜头，背景可见南瓜灯装饰与模糊的行人，空中点缀着闪烁的白色星星特效。镜头从她的面部缓缓拉远，展现其全身造型与节日场景，阳光透过街边灯牌洒下温暖光晕，画面洋溢着青春活力与童话般的梦幻感。电影级画质，8k分辨率，细腻皮肤纹理，柔焦效果，光影层次丰富，6秒时长，24帧/秒，运动强度3-5，丝滑流畅。",
      saveSwitch: false,
    },
    endpoints: {
      upload: uploadEndpoint,
      run: "https://www.runninghub.ai/openapi/v2/run/ai-app/2060339430623367169",
      query: queryEndpoint,
    },
    nodes: {
      image: { nodeId: "267", fieldName: "image", description: "Reference image" },
      width: { nodeId: "263", fieldName: "value", description: "Width" },
      height: { nodeId: "264", fieldName: "value", description: "High" },
      duration: { nodeId: "265", fieldName: "Value", description: "Video duration" },
      prompt: { nodeId: "278", fieldName: "text", description: "Prompt" },
      saveSwitch: { nodeId: "333", fieldName: "value", description: "Save switch" },
    },
  },
];

export const defaultAppId = runningHubApps[0].id;

export const fileLimits = {
  imageBytes: 20 * 1024 * 1024,
  videoBytes: 250 * 1024 * 1024,
  extractedBytes: 1024 * 1024 * 1024,
  resultUrlTtlMs: 24 * 60 * 60 * 1000,
};
