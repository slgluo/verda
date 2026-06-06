import { Modal, Progress } from 'antd'
import React from 'react'

export interface AdjustMessage {
  pkg: string
  result: string
  progress: number
  total: number
}

export interface AdjustProgressModalProps {
  open: boolean
  messages: AdjustMessage[]
  finished: boolean
  onClose: () => void
}

export const AdjustProgressModal: React.FC<AdjustProgressModalProps> = ({
  open,
  messages,
  finished,
  onClose,
}) => {
  const latest = messages[messages.length - 1]
  const percent = latest ? Math.round((latest.progress / latest.total) * 100) : 0

  return (
    <Modal
      title="整理 Storage"
      open={open}
      onCancel={onClose}
      footer={null}
      closable={finished}
      maskClosable={finished}
    >
      <Progress percent={percent} status={finished ? 'success' : 'active'} />
      <div className="mt-4 max-h-[300px] overflow-y-auto text-sm font-mono cus-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={msg.result === 'fail' ? 'text-red-500' : 'text-green-600'}>
            [
            {msg.progress}
            /
            {msg.total}
            ]
            {' '}
            {msg.pkg}
            {' '}
            -
            {' '}
            {msg.result}
          </div>
        ))}
      </div>
    </Modal>
  )
}
