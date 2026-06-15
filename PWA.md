# iPhone PWA 版本

`public` 目录现在可以直接部署到 GitHub Pages 或 Cloudflare Pages。

## 保留功能

- iPhone 选择图片和视频
- 直接上传到 RunningHub
- 提交和查询生成任务
- 浏览器内解压 ZIP
- 视频在线预览
- 通过 iOS 分享菜单保存到“文件”或其他 App
- API Key 和历史记录保存在当前 Safari 本地
- 添加到 iPhone 主屏幕

## 与 Windows 本地版的区别

- PWA 无法静默写入固定的 Windows 下载目录。
- iPhone 保存视频时会弹出系统分享菜单。
- 首次打开以及调用 RunningHub 时需要联网。
- API Key 存在 iPhone Safari 的本地存储中，清除网站数据会一并删除。

## GitHub Pages

将 `public` 目录中的文件发布为站点根目录即可。站点必须使用 HTTPS，PWA 和 Service Worker 才能正常工作。
