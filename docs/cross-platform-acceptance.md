# rc.4.2 跨系统验收

实现与实测分开。macOS/Linux脚本测试不是AI宿主完整流程；Windows尚无已授权可用测试机，不标通过。本文件只给承接人直接执行步骤，不新增费用、不更改安全策略。

## Windows待验（普通用户、本地NTFS）

需要已有Windows 10/11或Windows Server交互账号、Node>=18.19.1、内置Windows PowerShell 5.1、浏览器；不需管理员、不需真实用户数据或模型密钥。执行策略须已允许本包脚本；如被组织策略禁止，记录失败，不能绕过。不要在OneDrive、网络盘、WSL挂载路径测试权限。

1. 将ZIP解压到全新普通用户可写目录；核对中文reference文件存在。记录Windows/Node/PowerShell版本和文件系统。
2. 执行`npm test`。Windows ACL专项必须实际运行，不把跳过当通过。所有输出错误只能固定代码，不含内部栈/请求正文。
3. 用`node scripts/create_private_json.mjs --empty request.json`创建；通过宿主正常写文件工具原地写合成请求，再执行`node scripts/check_private_file.mjs request.json`。用`icacls request.json`和文件安全属性核对ACL：禁止继承，仅当前SID有显式允许权限；不要用mode600代替。
4. 按README和host-acceptance做一条单人多轮流程：先同意后调用，逐条核对；明确否认一个服务器原句，仍照印但只在该句旁有标记；报告实际打开。核查request/profile/report/HTML四类文件的ACL，重复输出不能覆盖。
5. 一条合盘计算和对话流程，不生成面向用户的合盘报告文件；拒绝传输时零计算接口调用。
6. 权限负例仅对本次合成文件增加Everyone读取，读取应拒绝、不能自动修ACL；不要修改其他目录权限。若已有第二个普通用户授权，可验证其不能读正常文件；没有则标访问隔离实测未完成，不伪造。
7. 记录宿主、模型、网络方式、版本、文件ACL结果、HTML打开证据及命令拦截；不得关闭安全检查。未验证的宿主和系统不写成支持。

## Linux

普通用户、原生POSIX文件系统、本次新目录、Node>=18.19.1。运行`npm test`，核对uid、600、空文件原地写入、拒绝覆盖/符号链接/硬链接/宽权限及错误脱敏。容器本地脚本通过不等于Linux AI宿主/API/GUI实测通过，外部联网须遵守所在环境规则。

## macOS宿主针对性复测

保留f56e232旧验收；本候选只重测A开场、B对应原句标记（不准/部分准/未核对）、C私有创建与受影响输出；报告实际打开并测试标记中的特殊字符。与同版本关联记录，不重做历史四组对照。模拟移动宽度不能写成iPhone Safari真机通过。
