# Verda

Verda 是一个 **Verdaccio NPM 私有仓库管理系统**，专为**内外网隔离**场景设计。

在实际使用中，开发者通常在外网环境中使用 Verdaccio 缓存 NPM 依赖，形成完整的 storage 目录。Verda 的核心用途是将这份**外网打包好的 Verdaccio storage**上传到内网私有仓库，实现依赖的离线同步。

由于外网 Verdaccio 中某个包的 `package.json` 会记录该包的**所有历史版本信息**，而内网实际上只存在部分版本的 `.tgz` 文件，直接使用会导致 `npm view <pkg> versions` 列出的版本与内网实际存在的文件不一致，造成安装失败。为此，Verda 提供了**存储整理（Adjust）**功能，自动扫描内网存储目录，根据实际存在的版本文件修复每个包的 `package.json`，确保列出的版本内网均有对应的文件包。

## 功能特性

- 📦 **包管理** — 浏览、搜索私有仓库中的所有 NPM 包
- ⬆️ **分片上传** — 支持大文件分片上传（默认 5MB/片），并通过 MD5 校验完整性
- 🔧 **依赖修复（Patch）** — 自动将包的依赖源从公网替换为私有仓库地址
- 🗂️ **存储整理（Adjust）** — 扫描内网存储目录，根据实际存在的版本文件修复 `package.json`，确保 `npm view <pkg> versions` 列出的版本均有对应文件包
- 🔍 **包详情** — 查看包的版本列表、依赖关系、发布时间等详细信息

## 技术栈

### 后端

| 技术 | 说明 |
|------|------|
| [Go 1.26](https://go.dev/) | 主语言 |
| [Fiber v2](https://gofiber.io/) | Web 框架 |
| [pkg/errors](https://github.com/pkg/errors) | 错误处理 |
| [samber/lo](https://github.com/samber/lo) | 泛型工具库 |
| [Masterminds/semver](https://github.com/Masterminds/semver) | 语义化版本处理 |

### 前端

| 技术 | 说明 |
|------|------|
| [React 19](https://react.dev/) | UI 框架 |
| [Vite](https://vitejs.dev/) | 构建工具 |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全 |
| [TanStack Router](https://tanstack.com/router) | 文件路由 |
| [TanStack Query](https://tanstack.com/query) | 服务端状态管理 |
| [Ant Design](https://ant.design/) | UI 组件库 |
| [UnoCSS](https://unocss.dev/) | 原子化 CSS |
| [spark-md5](https://github.com/satazor/js-spark-md5) | 文件 MD5 计算 |

## 项目结构

```
verda/
├── main.go              # 应用入口
├── start/               # CLI 参数配置
├── api/
│   └── storage/         # 存储相关 API 处理器
├── middleware/          # Fiber 中间件（静态文件服务）
├── pkg/
│   └── verdaccio/       # Verdaccio 核心逻辑（patch、依赖解析等）
├── utils/               # 工具函数（MD5、解压、文件操作）
└── web/                 # 前端项目（React + Vite）
    └── src/
        ├── routes/      # 页面路由
        ├── components/  # 公共组件
        └── hooks/       # 自定义 Hooks
```

## 快速开始

### 环境要求

- Go 1.26+
- Node.js 18+
- pnpm
- 已部署的 [Verdaccio](https://verdaccio.org/) 实例

### 后端启动

```bash
# 直接运行
go run . -port=3000 -mode=development

# 热重载（需安装 air）
air

# 构建二进制
go build -o ./tmp/main .
```

**启动参数：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `-port` | `3000` | 服务监听端口 |
| `-mode` | `production` | 运行模式：`development` / `production` |
| `-debug` | `false` | 是否开启 Debug 日志 |

### 前端启动

```bash
cd web

# 安装依赖
pnpm install

# 开发模式（代理 /api 到 localhost:3000）
pnpm dev

# 构建生产包
pnpm build

# 预览生产构建
pnpm preview
```

## API 接口

所有接口以 `/api/storage` 为前缀。

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/storage/upload` | 分片上传 NPM 包 |
| `POST` | `/api/storage/patch` | 修复包的依赖源地址 |
| `GET` | `/api/storage/adjust` | 整理 Verdaccio 存储目录 |
| `GET` | `/api/storage/packages` | 获取包列表（支持分页、搜索） |
| `GET` | `/api/storage/packages/+` | 获取指定包的详细信息 |

## 开发指南

### 代码风格

- 后端遵循 Go 标准风格，使用 `errors.Wrap()` 添加错误上下文
- 前端使用 ESLint（`@antfu/eslint-config`）进行代码检查

```bash
# 前端 Lint
pnpm lint

# 自动修复
pnpm lint:fix
```

### 测试

```bash
# 运行所有测试
go test ./...

# 运行指定包的测试
go test -v ./pkg

# 运行指定测试用例
go test -run TestName ./path
```

## 许可证

MIT
