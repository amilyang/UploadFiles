# 代码格式化工具使用说明

## 已安装的工具

### 1. Prettier
Prettier 是一个代码格式化工具，可以自动格式化代码，保持代码风格一致。

### 2. ESLint
ESLint 是一个代码检查工具，可以检测代码中的潜在问题和错误。

## 配置文件

- `.prettierrc` - Prettier 配置文件
- `.prettierignore` - Prettier 忽略文件配置
- `.eslintrc.cjs` - ESLint 配置文件
- `.vscode/settings.json` - VS Code 编辑器配置（自动格式化和保存时修复）

## NPM 脚本

### 格式化代码
```bash
npm run format
```
这个命令会格式化 `src` 目录下所有的 JavaScript、TypeScript、Vue、JSON、CSS、SCSS 和 Markdown 文件。

### 检查代码格式
```bash
npm run format:check
```
这个命令会检查代码格式是否符合 Prettier 的规范，但不会修改文件。

## Prettier 配置说明

```json
{
  "semi": true,                    // 使用分号
  "singleQuote": true,             // 使用单引号
  "tabWidth": 2,                   // 缩进宽度为 2 个空格
  "trailingComma": "es5",          // 在 ES5 允许的地方添加尾随逗号
  "printWidth": 100,               // 每行最大字符数为 100
  "arrowParens": "always",         // 箭头函数参数始终使用括号
  "endOfLine": "auto",             // 自动检测换行符
  "useTabs": false,                // 使用空格而不是制表符
  "bracketSpacing": true,          // 对象字面量中的括号之间添加空格
  "jsxSingleQuote": false          // JSX 中使用双引号
}
```

## VS Code 集成

如果你使用 VS Code，项目已经配置了以下功能：

1. **保存时自动格式化** - 保存文件时会自动运行 Prettier
2. **保存时自动修复 ESLint 问题** - 保存文件时会自动修复可修复的 ESLint 问题
3. **默认格式化工具** - 所有支持的文件类型都使用 Prettier 作为默认格式化工具

## 常见问题

### 1. 格式化后代码不符合预期
检查 `.prettierrc` 配置文件，调整相应的配置项。

### 2. 某些文件不想被格式化
将文件路径添加到 `.prettierignore` 文件中。

### 3. ESLint 和 Prettier 冲突
项目已经配置了 `eslint-config-prettier` 和 `eslint-plugin-prettier`，会自动解决冲突。

## 最佳实践

1. **提交代码前运行格式化**：确保代码风格一致
2. **使用 Git 钩子**：可以在提交前自动运行格式化（可选）
3. **团队协作**：确保团队成员都使用相同的配置文件

## 扩展阅读

- [Prettier 官方文档](https://prettier.io/)
- [ESLint 官方文档](https://eslint.org/)
