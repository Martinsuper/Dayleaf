<div align="center">
  <img src="website/img/app-icon.png" height="120">
  <h1>日笺 · Dayleaf</h1>
  <strong>Simple and secure journal app</strong>
  <img src="website/img/screenshot-1.png" width="100%" alt="Screenshot">
</div>

## Dayleaf

日笺（Dayleaf）是一款简洁、安全、专注于本地记录的个人日记应用。

支持同一天写多篇日记：使用“再写一篇”独立记录，通过当天篇目列表切换。空白新篇不会保存，搜索可直接定位到具体篇目。统计分别显示文章篇数与记录天数，连续记录按天计算。旧版每天一篇的内容会自动兼容，且不会推断旧文章的创建时间。JSON 和 Markdown 归档保留独立篇目及时间信息；外部日记和单篇 Markdown 导入保留为独立文章。

Project home: [**Dayleaf on GitHub**](https://github.com/Martinsuper/Dayleaf)

## 数据保存与恢复

- 自动保存会在关闭、锁定和导出前提交最新草稿；保存失败时保留窗口并提供重试。
- 导入遇到同日期记录时，可以跳过、合并或替换；只有写盘成功后才完成导入。
- 当前日记目录内的 `.dayleaf-backups` 保存最近 10 份加密快照。写作期间每隔至少 5 分钟的下一次保存，以及导入替换、改密码、重置和移动目录前会备份已有文件。
- 在“首选项 → 数据 → 备份与恢复”选择快照并输入该快照的密码恢复。改密码前的快照仍需要旧密码；本地快照不能代替异地备份。
- 移动目录会携带备份并记住新位置。图片以本地内嵌数据保存，单张上限 10 MB。
- 表格、MathML 公式与 Mermaid 图表使用预览展示，切换源码模式编辑；PDF 使用相同的安全 Markdown 渲染。

## 验证

使用 Node.js 22 与 Yarn Classic，执行 `yarn install --frozen-lockfile`。Playwright 与 `@playwright/test` 固定为同一版本。

```sh
yarn test:jest --runInBand
yarn test:types
yarn lint:ts
yarn lint:css
yarn format
yarn test:ui --workers=1
```

UI 测试使用独立临时日记，不访问个人日记。macOS 视觉基线应在确认界面变化后更新。

## Development

The application is built with Electron and React. To run or build the app yourself, you'll need to have Node.js and Yarn installed.

### Running the app

1. Clone this repository: `git clone REPO_URL`
2. Navigate into the project directory: `cd Dayleaf`
3. Install the dependencies: `yarn`
4. Run the app: `yarn start`

### Building the app

After cloning the repo and installing the dependencies, run `yarn build`. The packaged app can be found in the `dist` folder.

## Contributing

### Features and Bugs

Suggestions and contributions are always welcome! Please first discuss changes via issue before submitting a pull request.

### Adding missing translations

The list of all English strings can be found in [`en.ts`](./src/main/i18n/translations/en.ts). If there are translations missing for your language and you'd like to help with the translation, you can add the translated strings to your language's file in [`src/main/i18n/translations`](./src/main/i18n/translations) and submit a PR.

### Adding a new language

If the app isn't translated into your language yet and you'd like to help out, you can easily add translations with the following steps:

1. The translation files can be found in [`src/main/i18n/translations`](./src/main/i18n/translations). Duplicate the [`en.ts`](./src/main/i18n/translations/en.ts) file as `[LANG].ts`, where `[LANG]` is the [shortcode of your language](https://electronjs.org/docs/api/locales).
2. In the file you just created, replace the English translations with your own.
3. Import your file in the `ALL_TRANSLATIONS` object in [`src/main/i18n/i18n.ts`](./src/main/i18n/i18n.ts).
4. Add your language shortcode to the `electronLanguages` array in [`package.json`](./package.json).
5. Run the app in your language (see the steps [above](#development)) and make sure that the translations fit into the app (e.g. that they aren't too long for input fields).
6. Submit a PR. Thanks for your help!
