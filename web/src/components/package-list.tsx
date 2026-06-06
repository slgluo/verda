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

export const PackageList: React.FC<PackageListProps> = ({
  isLoading,
  isError,
  error,
  items,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="py-32 text-center text-gray-500">
        <div className="inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <div>加载中...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-32 text-center">
        <div className="text-red-500 text-lg mb-2">⚠️ 加载失败</div>
        <div className="text-gray-600 text-sm mb-4">{error?.message}</div>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          重试
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-32 text-center text-gray-500">
        <div className="text-5xl mb-4">📦</div>
        <div className="text-lg">暂无数据</div>
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
