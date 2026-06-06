import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { Empty, Spin, Tabs, Tag } from 'antd'
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
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <Empty description={(error as Error)?.message ?? '加载失败'} />
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
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-4">
          <Link to="/packages" className="text-sm color-blue-600 hover:underline">← 返回包列表</Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Header */}
          <div className="px-8 pt-6 pb-2 border-b border-gray-100">
            <h1 className="text-2xl font-700 color-#1a1a1a break-all m-0">{pkg.name}</h1>
            <div className="text-sm color-#666 mt-2">
              {latest && (
                <>
                  <span>{latest}</span>
                  <span className="mx-2">·</span>
                </>
              )}
              <span className="color-green-600">Public</span>
              {lastPublishTime && (
                <>
                  <span className="mx-2">·</span>
                  <span>
                    Published
                    {' '}
                    {formatRelativeTime(lastPublishTime)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 px-8 py-6">
            {/* Main content with tabs */}
            <div className="min-w-0">
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
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
                    label: `${depsCount} Dependency`,
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

            {/* Sidebar */}
            <aside className="space-y-6 text-sm">
              <SidebarBlock title="Install">
                <code className="block bg-gray-50 border border-gray-200 rounded px-3 py-2 font-mono text-xs break-all">
                  npm i
                  {' '}
                  {pkg.name}
                </code>
              </SidebarBlock>

              {repoUrl && (
                <SidebarBlock title="Repository">
                  <a href={repoUrl} target="_blank" rel="noreferrer" className="color-blue-600 hover:underline break-all">
                    {repoUrl.replace(/^https?:\/\//, '')}
                  </a>
                </SidebarBlock>
              )}

              {homepage && (
                <SidebarBlock title="Homepage">
                  <a href={homepage} target="_blank" rel="noreferrer" className="color-blue-600 hover:underline break-all">
                    {homepage}
                  </a>
                </SidebarBlock>
              )}

              <div className="grid grid-cols-2 gap-4">
                <SidebarBlock title="Version">
                  <span>{latest || '-'}</span>
                </SidebarBlock>
                <SidebarBlock title="License">
                  <span>{license || '-'}</span>
                </SidebarBlock>
              </div>

              <SidebarBlock title="Last publish">
                <span>{formatRelativeTime(lastPublishTime)}</span>
              </SidebarBlock>

              {author && (
                <SidebarBlock title="Author">
                  <span>{author}</span>
                </SidebarBlock>
              )}

              {keywords.length > 0 && (
                <SidebarBlock title="Keywords">
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map(k => (
                      <Tag key={k}>{k}</Tag>
                    ))}
                  </div>
                </SidebarBlock>
              )}
            </aside>
          </div>
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
    <div className="text-xs font-600 color-#888 uppercase tracking-wide mb-2">{title}</div>
    <div>{children}</div>
  </div>
)

const ReadmeView: React.FC<{ readme?: string }> = ({ readme }) => {
  if (!readme)
    return <Empty description="该包没有 README" />
  return (
    <div className="markdown-body bg-gray-50 border border-gray-200 rounded p-4 max-h-[600px] overflow-auto text-sm leading-7">
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
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-600 text-base mb-3">
          Dependencies (
          {depEntries.length}
          )
        </h3>
        {depEntries.length === 0
          ? (
              <div className="text-sm color-#888">无依赖</div>
            )
          : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 border-t border-gray-100 pt-3">
                {depEntries.map(([n, v]) => (
                  <div key={n} className="flex items-center justify-between text-sm">
                    <span className="color-red-600 break-all">{n}</span>
                    <span className="color-#888 text-xs ml-2">{v}</span>
                  </div>
                ))}
              </div>
            )}
      </div>
      <div>
        <h3 className="font-600 text-base mb-3">
          Dev Dependencies (
          {devDepEntries.length}
          )
        </h3>
        {devDepEntries.length === 0
          ? (
              <div className="text-sm color-#888">无</div>
            )
          : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 border-t border-gray-100 pt-3">
                {devDepEntries.map(([n, v]) => (
                  <div key={n} className="flex items-center justify-between text-sm">
                    <span className="color-red-600 break-all">{n}</span>
                    <span className="color-#888 text-xs ml-2">{v}</span>
                  </div>
                ))}
              </div>
            )}
      </div>
    </div>
  )
}

const DependentsView: React.FC<{ dependents: string[] }> = ({ dependents }) => {
  if (dependents.length === 0)
    return <Empty description="无依赖此包的本地包" />
  return (
    <div>
      <h3 className="font-600 text-base mb-3">
        Dependents (
        {dependents.length}
        )
      </h3>
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 pt-3">
        {dependents.map((d) => {
          const encoded = d.split('/').map(encodeURIComponent).join('/')
          return (
            <Link
              key={d}
              to="/detail/$"
              params={{ _splat: encoded }}
              className="color-red-600 hover:underline text-sm break-all"
            >
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
          <h3 className="font-600 text-base mb-3">Current Tags</h3>
          <div className="border border-gray-100 rounded">
            <div className="grid grid-cols-[1fr_1fr] px-4 py-2 text-xs color-#888 border-b border-gray-100">
              <span>Version</span>
              <span className="text-right">Tag</span>
            </div>
            {tagEntries.map(([tag, ver]) => (
              <div key={tag} className="grid grid-cols-[1fr_1fr] px-4 py-2 text-sm border-b border-gray-50 last:border-b-0">
                <span className="color-#333">{ver}</span>
                <span className="text-right color-#666">{tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="font-600 text-base mb-3">Version History</h3>
        <div className="border border-gray-100 rounded">
          <div className="grid grid-cols-[1fr_1fr] px-4 py-2 text-xs color-#888 border-b border-gray-100">
            <span>Version</span>
            <span className="text-right">Published</span>
          </div>
          {versions.map(v => (
            <div key={v.version} className="grid grid-cols-[1fr_1fr] px-4 py-2 text-sm border-b border-gray-50 last:border-b-0">
              <span className="color-#333">{v.version}</span>
              <span className="text-right color-#666">{formatDateTime(v.time)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
