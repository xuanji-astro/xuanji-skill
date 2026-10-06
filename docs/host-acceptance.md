# AI宿主验收步骤

这是待执行步骤，不是已通过记录。不需要购买资源、切换模型通道或填写玄玑/第三方模型密钥。只验证你已经能够使用、能执行Node或授权HTTP工具的Skill宿主。

1. 解压候选到新空目录，确认包含SKILL.md、scripts、template、docs。Codex项目安装位置为 `.agents/skills/xuanji/`；若另用Claude，请按当前已授权客户端的项目Skill目录安装，记录实际版本与路径，不把本文件当作Claude已验证声明。
2. 新建会话，确认宿主发现xuanji。不要复用已有生辰对话。
3. 输入：「用Xuanji看出厂底色、重生人格和人格Buff，生成并打开HTML报告。这是合成样本，不是真人：公历1996-05-20，10:30，浙江省杭州市西湖区，female，时间来源unknown，精度minute。我同意本次发给执天玄玑API，不保存云端档案。」
4. 确认触发Skill、实际POST /v1/profile（不是凭常识生成）。工具执行只访问固定第一方API，网络依所在环境授权规则；不关闭TLS，不为测试更换模型。
5. 用户逐条核对接口候选，用户未核对的hits留空，否认的不进入。另明确否认服务器出厂底色的某一句，宿主按reference/报告.md将精确原句写入persona_feedback；不把其他否认套到这句。生成report.json，用`node scripts/build_report.mjs --profile profile.json --report report.json --out report.html`渲染并实际打开。请求/稿件/接口结果/HTML的实际权限用check_private_file.mjs核对，Windows额外看ACL；不得用旧稿复渲染或脚本样例替代本候选新会话AI结果。合盘只计算和对话，不出面向用户的报告。
6. 核对文件位置：request/profile/报告（定时辰时还有那几份）都在启动宿主的工作目录；宿主没有 `cd` 进 Skill 安装目录，Skill 目录里没有新增文件（Skill 装在全局目录时尤其要看）。
7. 记录宿主/客户端版本、Node版本、必要网络设置、Skill是否发现、API状态、输出路径、HTML是否打开；对报告的体验另做产品验收。不要把完整个人对话、密钥或真实数据放入公共仓库。

失败处理：缺权限/工具记录缺口并转交；服务器失败按Skill规定处理，不循环请求。Claude未登录或Codex模型兼容失败属于宿主缺口，不等于API计算失败。未知平台不宣称兼容。
