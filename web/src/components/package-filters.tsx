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
    <div className="flex items-center justify-between gap-4 mb-8 mt-6 flex-wrap relative">
      <div className="flex-1 hidden md:block" />

      <div className="flex-1 flex justify-center min-w-[300px]">
        <Input.Search
          size="large"
          value={keyword}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="搜索包名..."
          allowClear
          className="w-full max-w-[600px] [&_.ant-input-wrapper]:rounded-full [&_.ant-input]:rounded-l-full [&_.ant-input-search-button]:rounded-r-full"
        />
      </div>

      <div className="flex-1 flex items-center justify-end gap-3">
        <Button type="primary" onClick={onUploadClick}>上传</Button>
        <Button onClick={onAdjustClick} loading={adjustLoading}>整理</Button>
      </div>
    </div>
  )
}
