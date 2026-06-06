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
      className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col h-full color-inherit no-underline cursor-pointer"
    >
      <div className="mb-3">
        <h3 className="text-lg font-600 color-#1a1a1a break-all">{name}</h3>
        {version && (
          <span className="text-xs font-500 bg-blue-50 color-blue-600 px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap inline-block mt-1">
            v
            {version}
          </span>
        )}
      </div>

      <div className="flex-1">
        {description && (
          <p className="text-sm color-#666 line-clamp-2 mb-3 h-10 leading-5">
            {description}
          </p>
        )}

        {keywords && keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {keywords.slice(0, 3).map(kw => (
              <span key={kw} className="text-xs bg-gray-100 color-#888 px-1.5 py-0.5 rounded border border-gray-200">
                {kw}
              </span>
            ))}
            {keywords.length > 3 && (
              <span className="text-xs color-#aaa px-1">
                +
                {keywords.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between text-xs color-#999">
        <div className="flex items-center gap-2">
          {author && <span className="truncate max-w-24" title={author}>{author}</span>}
        </div>
        <span>{timeStr}</span>
      </div>
    </Link>
  )
}
