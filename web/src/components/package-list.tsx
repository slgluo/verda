import type { PackageSummary } from './package-card'
import React from 'react'
import { PackageCard } from './package-card'

export interface PackageListProps {
  isLoading: boolean
  isError: boolean
  error: Error | null
  items: PackageSummary[]
  onRetry: () => void
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1">
          <div className="h-3 w-16 bg-gray-100 rounded mb-1.5" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>
        <div className="h-5 w-12 bg-indigo-50 rounded-full" />
      </div>
      <div className="h-3 w-full bg-gray-100 rounded mb-1.5" />
      <div className="h-3 w-2/3 bg-gray-100 rounded mb-4" />
      <div className="flex gap-1.5 mb-4">
        <div className="h-4 w-12 bg-gray-100 rounded-md" />
        <div className="h-4 w-10 bg-gray-100 rounded-md" />
        <div className="h-4 w-14 bg-gray-100 rounded-md" />
      </div>
      <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-gray-200" />
          <div className="h-3 w-16 bg-gray-100 rounded" />
        </div>
        <div className="h-3 w-24 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

export const PackageList: React.FC<PackageListProps> = ({
  isLoading,
  isError,
  error,
  items,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 xl:gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-base font-600 color-#111827 mb-1">加载失败</p>
        <p className="text-sm color-#6b7280 mb-5">{error?.message}</p>
        <button
          onClick={onRetry}
          className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-600 rounded-xl shadow-[0_2px_8px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_12px_rgba(99,102,241,0.45)] hover:opacity-90 transition-all cursor-pointer border-0"
        >
          重新加载
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-5 shadow-[0_4px_16px_rgba(99,102,241,0.1)]">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>
        <p className="text-base font-600 color-#374151 mb-1">暂无包</p>
        <p className="text-sm color-#9ca3af">上传你的第一个 NPM 包吧</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 xl:gap-6">
      {items.map(pkg => (
        <PackageCard key={pkg.name} pkg={pkg} />
      ))}
    </div>
  )
}
