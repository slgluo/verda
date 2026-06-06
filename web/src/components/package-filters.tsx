import { Button, Input } from 'antd'
import React from 'react'

export interface PackageFiltersProps {
  keyword: string
  onSearchChange: (value: string) => void
  onUploadClick: () => void
  onAdjustClick: () => void
  adjustLoading?: boolean
}

export const PackageFilters: React.FC<PackageFiltersProps> = ({
  keyword,
  onSearchChange,
  onUploadClick,
  onAdjustClick,
  adjustLoading,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 mb-6 flex-wrap relative">
      {/* 左侧标题区 */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_2px_8px_rgba(99,102,241,0.35)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-700 color-#111827 leading-tight">Packages</h1>
          <p className="text-xs color-#9ca3af leading-tight">私有 NPM 仓库</p>
        </div>
      </div>

      {/* 中间搜索框 */}
      <div className="flex-1 flex justify-center min-w-[260px] max-w-[520px]">
        <Input.Search
          size="large"
          value={keyword}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="搜索包名、描述、关键词..."
          allowClear
          className="w-full [&_.ant-input-wrapper]:!rounded-xl [&_.ant-input-affix-wrapper]:!rounded-l-xl [&_.ant-input-affix-wrapper]:!border-gray-200 [&_.ant-input-affix-wrapper:hover]:!border-indigo-400 [&_.ant-input-affix-wrapper-focused]:!border-indigo-500 [&_.ant-input-affix-wrapper-focused]:!shadow-[0_0_0_3px_rgba(99,102,241,0.1)] [&_.ant-input-search-button]:!rounded-r-xl [&_.ant-input-search-button]:!border-gray-200 [&_.ant-input-search-button]:!bg-gray-50 [&_.ant-input-search-button:hover]:!bg-indigo-50 [&_.ant-input-search-button:hover]:!border-indigo-400 [&_.ant-input-search-button:hover]:!color-indigo-600"
        />
      </div>

      {/* 右侧操作按钮 */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          onClick={onAdjustClick}
          loading={adjustLoading}
          className="!rounded-xl !border-gray-200 !color-#374151 !font-500 hover:!border-indigo-300 hover:!color-indigo-600 hover:!bg-indigo-50 transition-all"
          icon={(
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          )}
        >
          整理
        </Button>
        <Button
          type="primary"
          onClick={onUploadClick}
          className="!rounded-xl !bg-gradient-to-r !from-indigo-500 !to-purple-600 !border-0 !font-600 !shadow-[0_2px_8px_rgba(99,102,241,0.35)] hover:!shadow-[0_4px_12px_rgba(99,102,241,0.45)] hover:!opacity-90 transition-all"
          icon={(
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        >
          上传包
        </Button>
      </div>
    </div>
  )
}
