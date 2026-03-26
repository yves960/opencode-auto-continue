# opencode-auto-continue

Auto-send "继续" when model fails (429, errors, etc.)

## 功能

当 OpenCode 调用模型失败时（如 429 rate limit、网络错误等），自动发送"继续"让对话继续进行，无需手动干预。

## 支持的错误类型

- 429 Too Many Requests
- Rate limit 错误
- 服务暂时不可用
- 网络超时
- 连接重置
- 其他可重试错误

## 安装

### 从 npm 安装

在 `opencode.json` 中添加：

```json
{
  "plugin": ["opencode-auto-continue"]
}
```

### 从本地安装

将插件文件放在 `.opencode/plugins/` 目录下。

## 配置

插件会自动工作，无需额外配置。

## 工作原理

1. 监听 `session.error` 事件
2. 检测错误是否为可重试错误
3. 自动发送"继续"消息
4. 显示 toast 通知用户

## 许可证

MIT