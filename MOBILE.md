# iPhone 使用说明

## 打开方式

用 Safari 打开：

<https://marcusyan777-beep.github.io/runninghub-tool/>

可以点 Safari 分享按钮，选择“添加到主屏幕”，当成本地网页应用使用。

## 第一次使用

1. 打开页面。
2. 点右上角“API 设置”。
3. 输入 RunningHub API Key。
4. 保存。

API Key 只保存在这个网站的浏览器本地数据里。

## 生成流程

1. 选择服装图片。
2. 选择参考视频。
3. 检查图片和视频预览。
4. 调整参数。
5. 点“开始生成”。
6. 等待 RunningHub 返回结果。
7. 结果视频出现后，满意就点“下载视频”。
8. 不满意就点“删除视频预览”，再点“重新生成”。

## 清理内存

点“清理当前”会清掉：

- 当前任务显示
- 导入图片预览
- 导入视频预览
- 解压后的视频/图片预览
- 页面里的临时 Blob URL

它不会删除：

- 你已经保存到“文件”App 的视频
- RunningHub 云端结果
- GitHub 仓库里的网页源码

## 出错时怎么反馈

如果出现错误，不要只截图“错误码”。请展开“任务详情 / 错误详情”，把里面的文字也发出来。

重点看这些字段：

- `stage`
- `endpoint`
- `taskId`
- `runninghubStatus`
- `error`

## 旧版本缓存

如果页面看起来没有更新，可以打开：

<https://marcusyan777-beep.github.io/runninghub-tool/?v=latest>

或者删除主屏幕图标后重新添加。
