import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { Tabs } from 'antd'
import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export const Route = createFileRoute('/detail/$')({
  component: PackageDetailPage,
})

interface DistInfo {
  tarball?: string
  shasum?: string
  integrity?: string
  fileCount?: number
  unpackedSize?: number
}

interface RepositoryInfo {
  type?: string
  url?: string
}

interface VersionInfo {
  name?: string
  version?: string
  description?: string
  main?: string
  module?: string
  types?: string
  keywords?: string[]
  homepage?: string
  bugs?: { url?: string } | string
  repository?: RepositoryInfo | string
  license?: string | { type?: string }
  author?: string | { name?: string, email?: string, url?: string }
  contributors?: Array<string | { name?: string }>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  dist?: DistInfo
}

interface PackageDetail {
  'name': string
  'dist-tags': Record<string, string>
  'versions': Record<string, VersionInfo>
  'time': Record<string, string>
  'readme'?: string
  '_attachments'?: Record<string, { shasum?: string }>
}

interface DetailResp {
  code: number
  message: string
  data: {
    package: PackageDetail
    dependents: string[]
    distFiles: string[]
  }
}

function fetchPackageDetail(name: string): Promise<DetailResp> {
  // 对 scope 中的 `/` 编码以避免 URL 路径冲突
  const encoded = name.split('/').map(encodeURIComponent).join('/')
  return fetch(`/api/storage/packages/${encoded}`).then((r) => {
    if (!r.ok)
      throw new Error(`请求失败: ${r.status}`)
    return r.json() as Promise<DetailResp>
  })
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr)
    return ''
  try {
    const date = new Date(dateStr)
    const diff = Date.now() - date.getTime()
    const sec = Math.floor(diff / 1000)
    const min = Math.floor(sec / 60)
    const hour = Math.floor(min / 60)
    const day = Math.floor(hour / 24)
    const month = Math.floor(day / 30)
    const year = Math.floor(day / 365)
    if (year > 0)
      return `${year} 年前`
    if (month > 0)
      return `${month} 个月前`
    if (day > 0)
      return `${day} 天前`
    if (hour > 0)
      return `${hour} 小时前`
    if (min > 0)
      return `${min} 分钟前`
    return '刚刚'
  }
  catch {
    return dateStr
  }
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr)
    return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  catch {
    return dateStr
  }
}

function normalizeLicense(lic?: VersionInfo['license']): string {
  if (!lic)
    return ''
  if (typeof lic === 'string')
    return lic
  return lic.type ?? ''
}

function normalizeAuthor(a?: VersionInfo['author']): string {
  if (!a)
    return ''
  if (typeof a === 'string')
    return a
  return a.name ?? ''
}

function normalizeRepoUrl(r?: VersionInfo['repository']): string {
  if (!r)
    return ''
  const url = typeof r === 'string' ? r : (r.url ?? '')
  // 处理常见 git+ 和 .git 后缀
  return url
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '')
}

function PackageDetailPage() {
  const params = useParams({ from: '/detail/$' })
  const splat = (params as { _splat?: string })._splat ?? ''
  const name = useMemo(() => decodeURIComponent(splat), [splat])

  const { data, isLoading, isError, error } = useQuery<DetailResp>({
    queryKey: ['package-detail', name],
    queryFn: () => fetchPackageDetail(name),
    enabled: Boolean(name),
  })

  const [activeTab, setActiveTab] = useState('readme')

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#f8f9fc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_4px_16px_rgba(99,102,241,0.35)] animate-pulse">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <p className="text-sm color-#9ca3af font-500">加载包信息...</p>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="w-full min-h-screen bg-[#f8f9fc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-base font-600 color-#111827">加载失败</p>
          <p className="text-sm color-#6b7280">{(error as Error)?.message ?? '未知错误'}</p>
        </div>
      </div>
    )
  }

  const pkg = data.data.package
  const dependents = data.data.dependents ?? []
  const distTags = pkg['dist-tags'] ?? {}
  const latest = distTags.latest ?? Object.keys(pkg.versions ?? {}).pop() ?? ''
  const latestInfo: VersionInfo = pkg.versions?.[latest] ?? {}

  const versionEntries = Object.entries(pkg.versions ?? {})
  const versionList = versionEntries
    .map(([v]) => ({ version: v, time: pkg.time?.[v] }))
    .sort((a, b) => {
      const ta = a.time ? new Date(a.time).getTime() : 0
      const tb = b.time ? new Date(b.time).getTime() : 0
      return tb - ta
    })

  const deps = latestInfo.dependencies ?? {}
  const devDeps = latestInfo.devDependencies ?? {}
  const depsCount = Object.keys(deps).length

  const license = normalizeLicense(latestInfo.license)
  const author = normalizeAuthor(latestInfo.author)
  const repoUrl = normalizeRepoUrl(latestInfo.repository)
  const homepage = latestInfo.homepage ?? ''
  const keywords = latestInfo.keywords ?? []
  const lastPublishTime = pkg.time?.[latest] ?? pkg.time?.modified

  return (
    <div className="w-full min-h-screen bg-[#f8f9fc]">
      {/* 顶部 sticky header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          {/* 返回按钮 */}
          <Link
            to="/packages"
            className="flex items-center gap-1.5 text-sm color-#6b7280 hover:color-indigo-600 transition-colors no-underline font-500"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <span className="color-#d1d5db">/</span>
          {/* 包名面包屑 */}
          <span className="text-sm font-600 color-#111827 truncate">{pkg.name}</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 包信息 Hero 区 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] mb-6 overflow-hidden">
          {/* 顶部渐变装饰条 */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="px-8 pt-6 pb-6">
            <div className="flex items-start gap-4 flex-wrap">
              {/* 包图标 */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_4px_16px_rgba(99,102,241,0.3)] shrink-0">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1.5">
                  <h1 className="text-2xl font-700 color-#111827 break-all m-0 leading-tight">{pkg.name}</h1>
                  {latest && (
                    <span className="text-sm font-600 bg-gradient-to-r from-indigo-50 to-purple-50 color-indigo-600 px-3 py-1 rounded-full border border-indigo-100 whitespace-nowrap shrink-0">
                      v
                      {latest}
                    </span>
                  )}
                  <span className="text-xs font-600 bg-emerald-50 color-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100 whitespace-nowrap shrink-0">
                    Public
                  </span>
                </div>
                {latestInfo.description && (
                  <p className="text-sm color-#6b7280 leading-relaxed mb-3">{latestInfo.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs color-#9ca3af flex-wrap">
                  {lastPublishTime && (
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      发布于
                      {' '}
                      {formatRelativeTime(lastPublishTime)}
                    </span>
                  )}
                  {author && (
                    <span className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-700 text-[9px]">
                        {author.charAt(0).toUpperCase()}
                      </div>
                      <span className="color-#6b7280 font-500">{author}</span>
                    </span>
                  )}
                  {license && (
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      {license}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* 左侧主内容 Tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              className="[&_.ant-tabs-nav]:!px-6 [&_.ant-tabs-nav]:!mb-0 [&_.ant-tabs-nav]:!border-b [&_.ant-tabs-nav]:!border-gray-100 [&_.ant-tabs-ink-bar]:!bg-indigo-500 [&_.ant-tabs-tab.ant-tabs-tab-active_.ant-tabs-tab-btn]:!color-indigo-600 [&_.ant-tabs-tab:hover_.ant-tabs-tab-btn]:!color-indigo-500 [&_.ant-tabs-content-holder]:!px-6 [&_.ant-tabs-content-holder]:!py-5"
              items={[
                {
                  key: 'readme',
                  label: 'Readme',
                  children: (
                    <ReadmeView readme={pkg.readme} />
                  ),
                },
                {
                  key: 'dependencies',
                  label: `${depsCount} Dependencies`,
                  children: (
                    <DependenciesView deps={deps} devDeps={devDeps} />
                  ),
                },
                {
                  key: 'dependents',
                  label: `${dependents.length} Dependents`,
                  children: (
                    <DependentsView dependents={dependents} />
                  ),
                },
                {
                  key: 'versions',
                  label: `${versionList.length} Versions`,
                  children: (
                    <VersionsView
                      distTags={distTags}
                      versions={versionList}
                    />
                  ),
                },
              ]}
            />
          </div>

          {/* 右侧 Sidebar */}
          <aside className="space-y-4 text-sm">
            {/* 安装命令 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
              <div className="text-xs font-600 color-#374151 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
                Install
              </div>
              <div className="bg-[#f8f9fc] border border-gray-100 rounded-xl px-4 py-3 font-mono text-xs color-#374151 break-all select-all">
                npm i
                {' '}
                {pkg.name}
              </div>
            </div>

            {/* 元信息卡片 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <SidebarBlock title="Version">
                  <span className="font-600 color-#111827">{latest || '-'}</span>
                </SidebarBlock>
                <SidebarBlock title="License">
                  <span className="font-600 color-#111827">{license || '-'}</span>
                </SidebarBlock>
              </div>

              <SidebarBlock title="Last publish">
                <div>
                  <div className="font-600 color-#111827">{formatRelativeTime(lastPublishTime)}</div>
                  {lastPublishTime && (
                    <div className="text-xs color-#9ca3af mt-0.5">{formatDateTime(lastPublishTime)}</div>
                  )}
                </div>
              </SidebarBlock>

              {author && (
                <SidebarBlock title="Author">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-700 text-[10px] shrink-0">
                      {author.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-500 color-#374151">{author}</span>
                  </div>
                </SidebarBlock>
              )}

              {repoUrl && (
                <SidebarBlock title="Repository">
                  <a href={repoUrl} target="_blank" rel="noreferrer" className="color-indigo-600 hover:color-indigo-700 break-all no-underline hover:underline text-xs">
                    {repoUrl.replace(/^https?:\/\//, '')}
                  </a>
                </SidebarBlock>
              )}

              {homepage && (
                <SidebarBlock title="Homepage">
                  <a href={homepage} target="_blank" rel="noreferrer" className="color-indigo-600 hover:color-indigo-700 break-all no-underline hover:underline text-xs">
                    {homepage}
                  </a>
                </SidebarBlock>
              )}
            </div>

            {/* 关键词卡片 */}
            {keywords.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <SidebarBlock title="Keywords">
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {keywords.map(k => (
                      <span key={k} className="text-xs bg-gray-50 color-#6b7280 px-2.5 py-1 rounded-lg border border-gray-200 font-500">
                        {k}
                      </span>
                    ))}
                  </div>
                </SidebarBlock>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

interface SidebarBlockProps {
  title: string
  children: React.ReactNode
}

const SidebarBlock: React.FC<SidebarBlockProps> = ({ title, children }) => (
  <div>
    <div className="text-xs font-600 color-#9ca3af uppercase tracking-wider mb-2">{title}</div>
    <div className="text-sm">{children}</div>
  </div>
)

const ReadmeView: React.FC<{ readme?: string }> = ({ readme }) => {
  if (!readme) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <p className="text-sm color-#9ca3af">该包没有 README</p>
      </div>
    )
  }
  return (
    <div className="markdown-body bg-[#f8f9fc] border border-gray-100 rounded-xl p-5 max-h-[800px] overflow-auto text-sm leading-7 cus-scrollbar">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
    </div>
  )
}

interface DependenciesViewProps {
  deps: Record<string, string>
  devDeps: Record<string, string>
}

const DependenciesView: React.FC<DependenciesViewProps> = ({ deps, devDeps }) => {
  const depEntries = Object.entries(deps)
  const devDepEntries = Object.entries(devDeps)

  function DepList({ entries, empty }: { entries: [string, string][], empty: string }) {
    if (entries.length === 0) {
      return <p className="text-sm color-#9ca3af py-2">{empty}</p>
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-3 border-t border-gray-100">
        {entries.map(([n, v]) => (
          <div key={n} className="flex items-center justify-between bg-[#f8f9fc] rounded-lg px-3 py-2 text-sm">
            <span className="color-indigo-600 font-500 break-all">{n}</span>
            <span className="color-#9ca3af text-xs ml-2 shrink-0">{v}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-600 text-sm color-#374151 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center text-xs color-indigo-600 font-700">{depEntries.length}</span>
          Dependencies
        </h3>
        <DepList entries={depEntries} empty="无依赖" />
      </div>
      <div>
        <h3 className="font-600 text-sm color-#374151 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-purple-50 flex items-center justify-center text-xs color-purple-600 font-700">{devDepEntries.length}</span>
          Dev Dependencies
        </h3>
        <DepList entries={devDepEntries} empty="无开发依赖" />
      </div>
    </div>
  )
}

const DependentsView: React.FC<{ dependents: string[] }> = ({ dependents }) => {
  if (dependents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm color-#9ca3af">无依赖此包的本地包</p>
      </div>
    )
  }
  return (
    <div>
      <h3 className="font-600 text-sm color-#374151 mb-3 flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center text-xs color-indigo-600 font-700">{dependents.length}</span>
        Dependents
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-3 border-t border-gray-100">
        {dependents.map((d) => {
          const encoded = d.split('/').map(encodeURIComponent).join('/')
          return (
            <Link
              key={d}
              to="/detail/$"
              params={{ _splat: encoded }}
              className="flex items-center gap-2 bg-[#f8f9fc] rounded-lg px-3 py-2 text-sm color-indigo-600 font-500 no-underline hover:bg-indigo-50 hover:color-indigo-700 transition-colors break-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              {d}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

interface VersionsViewProps {
  distTags: Record<string, string>
  versions: Array<{ version: string, time?: string }>
}

const VersionsView: React.FC<VersionsViewProps> = ({ distTags, versions }) => {
  const tagEntries = Object.entries(distTags)
  return (
    <div className="space-y-6">
      {tagEntries.length > 0 && (
        <div>
          <h3 className="font-600 text-sm color-#374151 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center text-xs color-emerald-600 font-700">{tagEntries.length}</span>
            Current Tags
          </h3>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr] px-4 py-2.5 text-xs font-600 color-#9ca3af bg-[#f8f9fc] border-b border-gray-100 uppercase tracking-wide">
              <span>Version</span>
              <span className="text-right">Tag</span>
            </div>
            {tagEntries.map(([tag, ver]) => (
              <div key={tag} className="grid grid-cols-[1fr_1fr] px-4 py-3 text-sm border-b border-gray-50 last:border-b-0 hover:bg-[#f8f9fc] transition-colors">
                <span className="font-600 color-indigo-600">{ver}</span>
                <span className="text-right">
                  <span className="text-xs font-600 bg-emerald-50 color-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">{tag}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="font-600 text-sm color-#374151 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center text-xs color-indigo-600 font-700">{versions.length}</span>
          Version History
        </h3>
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr] px-4 py-2.5 text-xs font-600 color-#9ca3af bg-[#f8f9fc] border-b border-gray-100 uppercase tracking-wide">
            <span>Version</span>
            <span className="text-right">Published</span>
          </div>
          {versions.map(v => (
            <div key={v.version} className="grid grid-cols-[1fr_1fr] px-4 py-3 text-sm border-b border-gray-50 last:border-b-0 hover:bg-[#f8f9fc] transition-colors">
              <span className="font-600 color-#374151">{v.version}</span>
              <span className="text-right text-xs color-#9ca3af">{formatDateTime(v.time)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
