# 文件许可范围

本发行包的自有代码、指令、文档、报告规则及单人品牌模板按根目录Apache License 2.0许可。包括template/single-brand.html、reference/报告.md、scripts/build_report.mjs、scripts/report_rules.json，以及经批准恢复的reference/解读.md和reference/合盘.md；定时辰的reference/定时辰.md、scripts/rectify.mjs，以及报告自查scripts/check_report.mjs同样适用。NOTICE为归属通知，不另加限制。

`assets/founder-wechat.png` 是执天玄玑创始人的个人微信二维码，属于个人联系方式，**不在 Apache-2.0 授权范围内**：只供官方 Skill 生成的报告原样显示，不授予以其他方式使用、修改或再分发的权利。修改版或独立 Fork 请删去这张图或换成自己的联系方式；删去以后，报告里「与玄玑建立连接」那一块不出。维护：这一份跟主站的 `founder-wechat.png` 是同一个文件（逐字节相同），换码时两处一起换。

官方API的访问、额度、频率和服务规则独立于源码许可。允许个人和企业正常使用Skill，也允许用结果辅助服务自己的付费客户；未经授权不代理／转售官方API、绕过限制或冒充官方。这些API规则不是对开源文件的禁止商用条件。

单人报告允许正常生成、保存和依法分享；合盘本次只作对话，不提供报告文件生成流程。第三方宿主生成内容、计算接口回包及用户个人信息不因源码许可自动获得公开他人信息的权利。品牌与官方身份见TRADEMARKS.md。

包内不包含服务端引擎、判词库、内部结构性判法、存档／引流业务或独立AGPL排盘服务代码。不复制第三方素材并改其许可。模板只使用浏览器绘图和系统字体名称，不分发字体文件、图片或外部前端库；客户端依赖Node内建模块，没有npm/pip运行依赖。

rc.4.2新增的Windows权限辅助脚本为本项目实现，同样按Apache-2.0；它调用操作系统已有的Windows PowerShell 5.1及.NET Framework，不在包中分发这些组件，不改变其原许可，也不自动安装它们。
