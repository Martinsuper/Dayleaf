# macOS 签名与公证

## 2026-10-27：启动即崩溃（DYLD / different Team IDs）

3.6.0 的崩溃日志显示主程序无法加载 Electron Framework：`mapping process and mapped file (non-platform) have different Team IDs`。本机同样复现：ad-hoc 包通过 `codesign --verify --deep --strict`，但启用了 Hardened Runtime，其 library validation 在没有 Team ID 的情况下拒绝加载框架。

ad-hoc 配置现在显式设置 `hardenedRuntime: false`，签名检查同时验证主程序和 Electron Framework 均为 ad-hoc 且没有 runtime 标志。Developer ID 正式分发仍使用 Hardened Runtime 和公证。

构建并在匹配架构的 Mac 上验证真实启动（测试使用临时用户目录，不读写个人日记）：

```sh
yarn build:ts
yarn electron-builder --config build/electron-builder.adhoc.cjs --mac dmg --arm64 --publish never -c.directories.output=dist/fixed
node scripts/smoke-mac.cjs dist/fixed/mac-arm64/Dayleaf.app
```

还应挂载 DMG，将其中的应用复制到测试目录，再运行同一启动检查。Intel CI 交叉构建 ARM64 时不能执行该 ARM64 程序，必须在 ARM64 Mac 上完成启动验收。ad-hoc 包没有 Apple 公证，下载后的 Gatekeeper 首次打开限制仍然存在；正式公开分发应使用上文所述 Developer ID 签名与公证流程。

## 本次问题

检查本地 `dist/mac-arm64/Dayleaf.app`（3.5.0）发现签名使用 `Apple Development`，不是面向站外分发的 `Developer ID Application`；Gatekeeper 检查返回 `CSSMERR_TP_CERT_REVOKED`。这是证书信任错误，不能据此判断应用文件已损坏，也不能把本次提示当作恶意软件检测结论。

原发布工作流设置 `CSC_IDENTITY_AUTO_DISCOVERY=false`，会跳过正常签名；旧 `electron-builder-notarize` 钩子在缺少凭据时会直接跳过公证。两者均不能保证发布包通过 Gatekeeper。

## Developer ID 正式发布（保留的可选方式）

1. 在 Apple Developer 账户创建有效的 **Developer ID Application** 证书，包含私钥，导出为密码保护的 `.p12`。开发证书及已撤销证书不可替代它。确认签名证书和公证凭据属于同一团队。
2. 在 GitHub 仓库 Actions secrets 中配置：
   - `MAC_CERTIFICATE_P12`：p12 文件的 Base64 内容。
   - `MAC_CERTIFICATE_PASSWORD`：p12 导出密码。
   - `APPLE_ID`：Apple 账户。
   - `APPLE_APP_SPECIFIC_PASSWORD`：该账户的应用专用密码。
   - `APPLE_TEAM_ID`：证书所属开发团队 ID。
3. 需要正式签名时，将工作流的构建配置切回 `build/electron-builder.release.cjs`，强制 Developer ID 签名，使用 electron-builder 内置的 notarytool 公证，并检查签名、附带的公证票据和 Gatekeeper。任一校验失败就停止发布。

本地正式构建（先在环境中配置上述凭据，或导入有效 Developer ID 证书）：

```sh
yarn build
yarn electron-builder --config build/electron-builder.release.cjs --mac dmg --publish never
```

本地还支持 electron-builder 的 `APPLE_API_KEY`、`APPLE_API_KEY_ID`、`APPLE_API_ISSUER` 或 `APPLE_KEYCHAIN_PROFILE` 公证认证方式。不要将私钥或密码写入仓库。

## 已发布版本

旧 DMG 不会因修改构建配置而自动修复，需要重新签名、公证和打包后发布新版本。收到修正版后退出旧应用，将新应用复制到 Applications 再打开。ad-hoc 版本需要用户在系统设置中确认打开；不要关闭整机 Gatekeeper。

当前机器仅检测到 Apple Development 身份；在提供有效 Developer ID 及公证凭据之前，无法生成并验证正式分发包。Windows 安装器的 SmartScreen 信任机制另行依赖 Windows 代码签名，本次检查只确认了 macOS 问题。

## 无开发者账号的 ad-hoc 发布（当前默认）

CI 使用 `macos-15-intel`，并显式传入 `--arm64` 交叉构建 Apple Silicon 安装包，避免依赖容量不足的 macOS ARM64 runner 池。安装包目标架构不随 runner 架构改变。

参考：[免开发者账号发布 macOS 应用](https://fblog.younote.top/posts/read/?id=d0d1d323-f65c-4680-9dfc-9c0ed6f0975a)。

标签发布工作流改用 `build/electron-builder.adhoc.cjs`：显式设置 `identity: '-'`，不使用本机证书、不提交 Apple 公证。Electron 的嵌套框架及辅助程序由 electron-builder 逐层签名，保留 Electron 所需的 entitlements。`afterSign` 必须确认 `Signature=adhoc`、无证书 Authority，并通过 `codesign --verify --deep --strict`；失败立即停止打包。仅上传打包好的 DMG，避免上传裸 `.app` 造成权限或符号链接丢失。

```sh
yarn build
yarn electron-builder --config build/electron-builder.adhoc.cjs --mac dmg --publish never
```

首次使用：把应用拖到「应用程序」，尝试打开；如被拦截，前往「系统设置 → 隐私与安全性 → 安全性」，找到日笺并点「仍要打开」，再确认。新版本可能需要再次确认及重新授予系统权限。

ad-hoc 只证明完整性，不提供受信任的开发者身份，`spctl` 拒绝属于预期，不能将其作为此模式的构建失败条件。文章把弹窗与签名状态一一对应的说法过于简化：具体提示及是否能手动放行受系统版本和策略影响，不能承诺所有机器都只出现「无法验证开发者」。

发布验收必须在另一台 Mac 或干净虚拟机上，用浏览器下载 DMG，拖入应用程序后验证完整性并走一遍首次打开流程；本机无 quarantine 的直接启动不能代替此验收。面向要求无拦截安装的用户，仍应使用上面的 Developer ID + 公证方案。
