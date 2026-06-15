# RunningHub 快捷生成器

这是一个个人自用的 RunningHub AI 应用快捷入口。当前版本针对固定 AI 应用：

- AI 应用 ID：`2060672373740883969`
- 功能：上传服装图片和参考视频，调用 RunningHub 生成视频结果

它不是通用 RunningHub 平台客户端。页面里的节点参数已经按这个 AI 应用写死。

## 在线使用

GitHub Pages：

<https://marcusyan777-beep.github.io/runninghub-tool/>

手机上可以用 Safari 打开，并添加到主屏幕。

## 本地使用

在 PowerShell 中运行：

```powershell
.\start.ps1
```

然后访问：

```text
http://127.0.0.1:4173
```

首次使用时点击“API 设置”，输入自己的 RunningHub API Key。

## 当前支持

- 图片和视频导入预览
- 文件大小提醒
- 调整视频时长、尺寸、蒙版扩张和抖动幅度
- 提交 RunningHub 任务并轮询状态
- 历史任务状态：生成中、排队中、成功、失败、已删除预览、结果已过期
- ZIP 自动在线解压，页面只保留可预览视频/图片
- 删除当前视频预览以释放浏览器内存
- 下载生成视频
- 任务详情/错误详情，便于排查 RunningHub 错误

## 隐私和安全

- API Key 只保存在当前浏览器的 `localStorage`。
- API Key 不会写入项目文件，也不会提交到 GitHub。
- 清除 Safari 网站数据会删除 API Key 和历史任务。
- GitHub 仓库里只有网页工具源码，不包含你的生成视频。
- RunningHub 返回的结果 URL 不会自动写入 GitHub，只保存在浏览器历史记录里。
- 结果 URL 通常有有效期，满意后请尽快保存到 iPhone 的“文件”App 或电脑下载目录。

## iPhone 内存占用

主要占用来自：

- 导入素材的图片/视频预览
- RunningHub 返回 ZIP 后的浏览器解压过程
- 解压出来的视频 Blob 预览
- 你手动保存到“文件”App 的视频

点“清理当前”会释放页面里的预览、结果和当前任务状态。点“删除视频预览”只删除当前网页内的预览对象，不删除已保存文件，也不删除 RunningHub 云端结果。

## 发布

构建 GitHub Pages 静态文件：

```powershell
npm run build:pwa
```

发布到 GitHub Pages 仓库：

```powershell
npm run deploy
```

默认部署到：

```text
https://github.com/marcusyan777-beep/runninghub-tool.git
```

也可以通过环境变量覆盖：

```powershell
$env:PAGES_REPO="https://github.com/your-name/your-repo.git"
$env:PAGES_BRANCH="main"
npm run deploy
```

## 文件说明

- `public/`：网页源码，GitHub Pages 使用的核心文件
- `public/app-config.js`：RunningHub 应用 ID、接口、节点映射和文件大小限制
- `pwa-dist/`：发布用静态文件，由 `npm run build:pwa` 生成
- `server.mjs`：电脑本地使用时的 Node 代理和保存接口
- `scripts/build-pwa.mjs`：生成发布目录
- `scripts/deploy-pages.mjs`：发布到 GitHub 仓库
- `scripts/extract-media.ps1`：本地模式下解压 RunningHub ZIP 结果

## 注意

不要把测试视频、生成结果、ZIP 或临时素材提交到仓库。`.gitignore` 已经忽略常见视频和缓存文件。

如果以后要接入另一个 RunningHub AI 应用，优先新增或修改 `public/app-config.js` 里的应用 ID、接口地址和节点映射。
