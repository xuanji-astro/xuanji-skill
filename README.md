# 执天玄玑 / Xuanji Skill V1

由杭州强势播传文化影视传媒有限公司提供。使用执天玄玑 API 计算八字、星盘、出厂底色、重生人格与人格 Buff，并可计算两人关系。它是面向 AI 助手的 Skill/API 客户端，不是“执天玄玑自研大模型”。服务可以使用自有算法、规则系统及第三方 AI 服务；当前计算 API 仍为预览入口，不承诺正式服务 SLA。

V1 不要求玄玑账号，不接我的档案库 / Personal Graph，不向玄玑长期人物档案保存请求。出生信息会经 HTTPS 发给 API；AI 宿主可能保存对话，本地请求与结果文件也不会自动删除。

已验证的AI宿主：macOS arm64 上的 Claude Code 2.1.291（rc.5.1，2026-10-06 真实宿主验收：发现Skill、排盘、定时辰、生成并打开报告；文件只建在启动宿主的工作目录，Skill目录不被改动；报告和命令里没有出生信息）。Kimi Code、Codex及其他宿主未通过完整验收。命令、工具、对话记录可能保留信息，文件不会自动删除。

## 安装

前提：Node.js >=18.19.1。macOS arm64及Linux普通用户容器的本地脚本实测结果随候选交付；Linux容器不是Linux AI宿主验收。Windows权限实现已纳入，实际Windows/宿主验收待完成，不宣称已验证支持。Windows实现要求本地NTFS、内置Windows PowerShell 5.1及系统允许执行本包脚本；FAT、网络共享、WSL映射盘不在Windows权限实现范围。被系统策略禁止时如实报错，不使用ExecutionPolicy Bypass、不关闭安全检查。克隆安装另需Git。无npm/pip第三方依赖，无需模型Key、CloudBase Key或数据库配置。

### 用发布包ZIP安装

在自己可写的位置新建空目录，解压 `Xuanji-Skill-0.1.0-rc.5.1.zip`，会得到 `xuanji/`。进入该目录，执行测试。不要覆盖现有同名Skill。文件采用Apache-2.0。

macOS可用Finder解压，或`ditto -x -k Xuanji-Skill-0.1.0-rc.5.1.zip <新空目录>`；Linux使用支持UTF-8文件名的解压工具，Windows可用系统解压或PowerShell Expand-Archive到新目录。核对`reference/报告.md`存在，不修改全局locale或覆盖旧包。

Codex本地项目安装：把完整 `xuanji/` 复制到该项目的 `.agents/skills/xuanji/`，**新开会话**，输入「用Xuanji看我的人格结构并生成HTML」。不要只复制SKILL.md，否则脚本和模板缺失。此路径为本轮使用的安装路径；本机Codex CLI因版本/账号模型兼容错误未能完成AI流程，不能把它说成已通过宿主验收。宿主验收步骤见 `docs/host-acceptance.md`。

也可以克隆本仓库：`git clone <本仓库地址> xuanji`。目录中 `SKILL.md` 是入口。将整个目录复制到支持 SKILL.md 的宿主技能目录。例如 Codex 可放到其 `skills/xuanji` 目录；其他宿主按自身安装方式处理。本仓不自动安装、不修改宿主设置。

进入目录执行：

```sh
npm test
node scripts/client.mjs health
```

在宿主输入“用 Xuanji 看我的人格结构”，按询问提供信息并同意向 API 传输。宿主需有授权的联网工具及 Node 执行工具；不支持脚本执行的宿主只能使用 [API 契约](docs/api.md) 的 HTTP 方式，不能声称已验证所有宿主。

## 命令行使用

下面的命令写的是包内相对路径，方便在包目录里自测。宿主（AI）实际给用户用时，在用户自己的工作目录里用 Skill 目录的绝对路径调用（`node <skill目录>/scripts/…`），文件都写在用户的工作目录，不写进 Skill 目录；见 SKILL.md「文件放在哪」。

把请求写入本地 `request.json`（合成示例见 [接口文档](docs/api.md)），不要把实际生辰放在 shell 参数或 Git：

```sh
node scripts/client.mjs profile --input request.json --output profile.json
node scripts/client.mjs pair --input pair-request.json --output pair.json
node scripts/build_report.mjs --profile profile.json --report report.json --out report.html
node scripts/rectify.mjs check --profile profile.json --request request.json --output request_alt.json
node scripts/rectify.mjs ask --a profile.json --b profile_alt.json --events events.json --output ask.json
node scripts/rectify.mjs score --a profile.json --b profile_alt.json --events events.json --ask ask.json --answers answers.json --output rectify.json
node scripts/build_report.mjs --profile profile.json --report report.json --rectify rectify.json --out report.html   # 定过时辰的
node scripts/check_report.mjs --request request.json --report report.html   # 只打有／没有生辰
```

后三行是定时辰（出生时间卡在时辰交界时）：只读本地文件打分，不联网；用户说的大事不发给接口。流程见 [reference/定时辰.md](reference/定时辰.md)。

默认 API 为 `https://api.xuanji-astro.com`，只能访问固定三条路径，不接受自定义服务器或重定向。无需环境变量；传 `--api`、凭证或保存 endpoint 会拒绝。超时默认90秒，可用 `--timeout-ms 1000` 缩短；不自动重试。网络必须遵守宿主/组织代理规则，脚本本身不提供代理隧道，也不允许用它绕过安全策略。

在需要HTTP代理的环境，Node18的内建fetch不会因为设置HTTP_PROXY就自动走代理；不要据此直连。可采用宿主已授权HTTP工具，或经允许使用支持 `--use-env-proxy` 的Node版本。本轮真实API链路在macOS arm64、Node25.9.0上，通过授权IPv4本机代理验证；Node18.19.1验证的是本地测试和渲染，不混称代理链路已通过。代理地址按用户环境设置，不能要求安装者照搬我们的内部地址；保留TLS证书校验。

单人品牌 `report.json` 格式与完整写法见 [reference/报告.md](reference/报告.md)。用户要单人报告才生成；hits只放用户答准／部分准的候选核对，未核对或跳过时留空，不准的不放入。以下只是保留的旧安全纯文本渲染器数据格式，**不是品牌报告格式**：

```json
{"title":"合成报告","summary":"依据 API 返回作解释，不伪造结果。","sections":[{"title":"依据","text":"此处由用户授权的 AI 宿主根据接口返回填写。"}]}
```

rc.4恢复获批的语气、安全规则、首屏展开、字段说明、候选核对、合盘对话及单人「照见」品牌模板、图表与报告写法，使用内联JS/SVG离线渲染，CSP禁止联网，无外部字体/追踪。模板去掉存档框及原始出生日期、时间、地点，仍包含盘面衍生数据，不可称匿名。合盘仅对话，不出合盘HTML。旧安全纯文本渲染器保留作为兼容工具，不作为合盘报告入口。

宿主把JSON通过工具标准输入交给`node scripts/create_private_json.mjs request.json`或同样创建report.json，不把生辰放进命令参数。macOS/Linux以600独占创建并检查本人所有权；Windows用受保护的仅当前用户NTFS ACL在创建时设置，不是事后icacls，也不声称Windows的600代表安全。请求、接口结果、报告稿和HTML输出共用权限实现，拒绝覆盖，不改其他文件。操作系统管理员及宿主本身仍可有额外能力，不能承诺绝对仅本人可见。实际验收范围以本候选测试记录为准。标准输入、工具和对话可能被宿主保留；请求文件内容会发送给API。

宿主没有独立标准输入通道时，用`node scripts/create_private_json.mjs --empty request.json`先独占创建受保护空文件，再用正常写文件工具原地写入。报告稿同样处理。禁止printf、heredoc、重定向或命令参数承载JSON，不关闭安全检查。写后执行`node scripts/check_private_file.mjs request.json`（report.json同理）；客户端/构建器读取前再检查。若工具替换文件破坏权限，停止，不发请求、不构建、不用chmod/icacls补救。文件不会自动删除。

当前候选A恢复直接陈述接口候选、最后核对的开场；核对前不算已确认，否认项不进hits。B在服务器人格原句旁显示用户对该句的反馈，需精确原句映射，不改服务器原句。C增加Linux POSIX处理及待Windows实测的NTFS ACL实现；[跨系统验收](docs/cross-platform-acceptance.md)列出剩余步骤。合盘仍只计算及对话，不提供面向用户的报告文件。

## 报错与隐私

错误代码/恢复方法见 [docs/api.md](docs/api.md)。不展示服务器原始错误、内部路径或栈。真实结果只在授权本地位置保存，文件权限尽量限制为本人可读；不要公开请求、结果、报告或对话。传输同意不等于授权云端长期存档，V1 没有存档功能。

## 许可证与服务

本包代码、文档、获批指引、单人报告模板／写法／构建器／规则采用Apache-2.0，见[文件许可范围](docs/license-scope.md)。许可方向已批准并完成文件核验与标注。API服务权限不由源码许可授予。服务端引擎、判词库、内部Prompt不在包中，AGPL排盘服务独立维护，不打包其源码或依赖。

Apache-2.0 不自动授权执天玄玑名称、Logo、官方身份。允许正常生成、保存和依法分享报告及原样转发官方包；个人和企业可正常使用并辅助服务付费客户。官方API额度／频率／禁止未经授权代理转售等规则不限制开源文件商用；不得冒充官方，见TRADEMARKS.md。

用户协议（Terms of Service）：https://xuanji-astro.com/terms

隐私政策（Privacy Policy）：https://xuanji-astro.com/privacy

当前版本 0.1.0-rc.5.1 是公开的候选版（Release Candidate）。
