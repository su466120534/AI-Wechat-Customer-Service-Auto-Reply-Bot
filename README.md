# 企业AI知识库微信客服

基于 qiye.aitiwo.com 企业知识库的智能客服机器人，支持一键部署，无需编程知识。

## 产品特点

### 🤖 企业级 AI 知识库
- 对接 [qiye.aitiwo.com](https://qiye.aitiwo.com) 平台
- 支持企业知识库导入和管理
- AI 基于企业知识库智能应答
- 适合客服、售后等场景

### 💻 一键安装部署
- 提供 Windows(.exe) 和 Mac(.dmg) 安装包
- 无需编程知识，下载即用
- 简单的扫码登录，无需复杂配置
- 界面直观，易于操作

### ⏰ 定时任务系统
- 可视化定时任务管理
- 支持群消息定时发送
- 灵活的时间设置
- 多群组同时任务支持

### 🛡️ 安全可靠
- 完善的白名单管理
- 群聊/私聊分别配置
- 消息前缀过滤
- 防止消息轰炸

### 🔄 稳定性保障
- 自动重连机制
- 异常自动恢复
- 完整的错误处理
- 详细的运行日志

## 快速开始

1. 下载安装包：
   - Windows: [百度网盘下载](https://pan.baidu.com/s/151G_jawmJV7wo-f71ckP0Q) 提取码: `xzup`
   - Mac: [百度网盘下载](https://pan.baidu.com/s/1FvYIm9GMDn1o2JAAg_VHKQ) 提取码: `7y5z`

   

2. 安装并运行程序：
   - Windows用户：下载后双击 .exe 文件进行安装
   - Mac用户：下载后双击 .dmg 文件进行安装

3. 配置 API Key：

   > 💡 快速测试：如果您想先体验效果，可以使用我们的测试 API Key：`api-a8eb627a0d2863dcd9ef2258adf8c93dAJ3Oh`
   > 
   > ⚠️ 注意：测试 Key 仅供体验，可能会有调用限制，建议创建自己的 API Key 以获得完整体验

   第一步：注册并登录
   - 访问 [qiye.aitiwo.com](https://qiye.aitiwo.com) 
   - 注册企业账号并登录

   第二步：创建知识库
   - 点击机器人选项卡，企业用户建议使用"知识库"功能
   - 创建新知识库
   - 上传知识文档(支持格式:docx、pdf、txt、md等)
   - 特别推荐:使用 CSV/XLSX 格式的问答表,包含 q(问题)和 a(答案)两列
   - 建议使用智谱清言模型进行知识库训练

   第三步：创建智能体
   - 点击左侧"机器人"
   - 点击"新增智能体"
   - 关联刚才创建的知识库
   - 选择模型(推荐:智谱清言)
   - 完成智能体创建

   第四步：获取 API Key
   - 点击"发布智能体"
   - 进入"API调用"页面
   - 点击"创建API"
   - 复制生成的 API Key

   第五步：配置到应用
   - 将复制的 API Key 粘贴到应用首页的配置框
   - 点击保存

4. 扫码登录：
   - 点击"启动机器人"
   - 使用微信扫描二维码
   - 在手机上确认登录

5. 配置白名单：
   - 设置允许响应的群组
   - 设置允许对话的联系人
   - 可选设置消息前缀

## 定时任务使用

1. 切换到"定时任务"标签页
2. 点击"新建任务"
3. 设置：
   - 填入群名
   - 输入要发送的消息
   - 设置发送时间
4. 点击保存即可

## 常见问题

Q: 如何获取 API Key？  
A: 访问 [qiye.aitiwo.com](https://qiye.aitiwo.com)，注册账号后创建知识库，在 API 调用页面获取。

Q: 支持哪些消息类型？  
A: 目前支持文本消息，后续可增加图片等类型支持。

Q: 如何设置群消息过滤？  
A: 可以在配置页面设置消息前缀，只有以特定前缀开头的消息才会触发回复。

## 更新日志

### v1.0.0
- 首次发布
- 支持企业知识库对接
- 支持定时任务
- 支持白名单管理

## 致谢

本项目基于 [wechaty-bot](https://github.com/wechaty/wechaty) 开发，感谢原作者的贡献。我们在此基础上进行了以下改进：

- 集成了 aitiwo.com 企业知识库功能
- 开发了桌面应用界面，支持一键部署
- 添加了定时任务系统
- 优化了稳定性和错误处理机制

## 许可证

本项目采用 MIT 许可证，查看 [LICENSE.md](LICENSE.md) 了解更多信息。

