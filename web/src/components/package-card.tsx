import { Link } from '@tanstack/react-router'
import React from 'react'

export interface PackageSummary {
  name: string
  version: string
  description: string
  keywords: string[]
  author: string
  updatedAt: string
}

export interface PackageCardProps {
  pkg: PackageSummary
}

export const PackageCard: React.FC<PackageCardProps> = ({ pkg }) => {
  const { name, version, description, keywords, updatedAt, author } = pkg

  const timeStr = React.useMemo(() => {
    if (!updatedAt)
      return ''
    try {
      const date = new Date(updatedAt)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    catch (e) {
      console.error('parse date error', e)
      return updatedAt
    }
  }, [updatedAt])

  const encodedName = name.split('/').map(encodeURIComponent).join('/')

  return (
    <Link
      to="/detail/$"
      params={{ _splat: encodedName }}
      className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(99,102,241,0.12),0_12px_32px_rgba(99,102,241,0.08)] hover:border-indigo-200 transition-all duration-250 flex flex-col h-full color-inherit no-underline cursor-pointer relative overflow-hidden"
    >
      {/* 顶部渐变装饰线 */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-250" />

      <div className="mb-3">
        <h3 className="text-base font-700 color-#111827 break-all leading-snug group-hover:color-indigo-600 transition-colors duration-200 mb-1.5">
          {name}
        </h3>
        {version && (
          <span className="text-xs font-600 bg-gradient-to-r from-indigo-50 to-purple-50 color-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100 whitespace-nowrap inline-block">
            v
            {version}
          </span>
        )}
      </div>

      <div className="flex-1">
        {description
          ? (
              <p className="text-sm color-#6b7280 line-clamp-2 mb-3 leading-relaxed">
                {description}
              </p>
            )
          : (
              <p className="text-sm color-#d1d5db italic mb-3 leading-relaxed">暂无描述</p>
            )}

        {keywords && keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {keywords.slice(0, 3).map(kw => (
              <span key={kw} className="text-xs bg-gray-50 color-#6b7280 px-2 py-0.5 rounded-md border border-gray-200 font-500">
                {kw}
              </span>
            ))}
            {keywords.length > 3 && (
              <span className="text-xs color-#9ca3af px-1 self-center">
                +
                {keywords.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-xs color-#9ca3af">
        <div className="flex items-center gap-1.5">
          {author && (
            <>
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-700 text-[9px] shrink-0">
                {author.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-24 font-500 color-#6b7280" title={author}>{author}</span>
            </>
          )}
        </div>
        {timeStr && (
          <span className="shrink-0">{timeStr}</span>
        )}
      </div>
    </Link>
  )
}
