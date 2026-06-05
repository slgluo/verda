import type { AdjustMessage, PackageSummary } from '@/components'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Modal, Pagination } from 'antd'
import { useCallback, useMemo, useRef, useState } from 'react'
import { AdjustProgressModal, PackageFilters, PackageList, PackageUploadModal } from '@/components'
import { useDebouncedValue } from '../utils/useDebouncedValue'

export const Route = createFileRoute('/packages')({
  component: PackagesPage,
})

interface ListResp {
  code: number
  message: string
  data: {
    total: number
    page: number
    pageSize: number
    items: PackageSummary[]
  }
}

function fetchPackages(page: number, pageSize: number, keyword: string) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (keyword.trim())
    params.set('keyword', keyword.trim())
  return fetch(`/api/storage/packages?${params.toString()}`).then((r) => {
    if (!r.ok)
      throw new Error(`请求失败: ${r.status}`)
    return r.json() as Promise<ListResp>
  })
}

export function PackagesPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebouncedValue(keyword, 300)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustMessages, setAdjustMessages] = useState<AdjustMessage[]>([])
  const [adjustFinished, setAdjustFinished] = useState(false)
  const [adjustLoading, setAdjustLoading] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ListResp>({
    queryKey: ['packages', page, pageSize, debouncedKeyword],
    queryFn: () => fetchPackages(page, pageSize, debouncedKeyword),
    placeholderData: keepPreviousData,
  })

  const startAdjust = useCallback(() => {
    if (eventSourceRef.current)
      return

    setAdjustMessages([])
    setAdjustFinished(false)
    setAdjustLoading(true)
    setIsAdjustModalOpen(true)

    const es = new EventSource('/api/storage/adjust')
    eventSourceRef.current = es

    es.onmessage = (event) => {
      const msg: AdjustMessage = JSON.parse(event.data)
      setAdjustMessages(prev => [...prev, msg])
    }

    es.addEventListener('done', () => {
      setAdjustFinished(true)
      setAdjustLoading(false)
      es.close()
      eventSourceRef.current = null
      void refetch()
    })

    es.onerror = () => {
      setAdjustFinished(true)
      setAdjustLoading(false)
      es.close()
      eventSourceRef.current = null
    }
  }, [refetch])

  const handleAdjust = useCallback(() => {
    Modal.confirm({
      title: '确认整理',
      content: '整理操作将会清理 Storage 中的冗余数据，是否继续？',
      okText: '确认',
      cancelText: '取消',
      onOk: startAdjust,
    })
  }, [startAdjust])

  const items = useMemo(() => {
    return data?.data.items ?? []
  }, [data?.data.items])

  const total = data?.data.total ?? 0

  return (
    <div className="w-full min-h-screen bg-gray-50 p-8 flex flex-col">
      <PackageFilters
        keyword={keyword}
        onSearchChange={(val) => {
          setKeyword(val)
          setPage(1)
        }}
        onUploadClick={() => setIsUploadModalOpen(true)}
        onAdjustClick={handleAdjust}
        adjustLoading={adjustLoading}
      />

      <main className="flex-1 cus-scrollbar p-6">
        <PackageList
          isLoading={isLoading}
          isError={isError}
          error={error as Error}
          items={items}
          onRetry={refetch}
        />
      </main>

      {!isLoading && !isError && items.length > 0 && (
        <div className="flex items-center justify-center mt-8 pt-6 border-t border-gray-200">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
            disabled={isFetching}
            onChange={p => setPage(p)}
            showTotal={(t, range) => `第 ${range[0]}-${range[1]} 条，共 ${t} 个包${isFetching ? '（加载中...）' : ''}`}
          />
        </div>
      )}

      <PackageUploadModal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => void refetch()}
      />

      <AdjustProgressModal
        open={isAdjustModalOpen}
        messages={adjustMessages}
        finished={adjustFinished}
        onClose={() => setIsAdjustModalOpen(false)}
      />
    </div>
  )
}
