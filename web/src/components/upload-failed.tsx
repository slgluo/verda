import { Button, Result } from 'antd'
import React from 'react'

export interface UploadFailedProps {
  title: string
  subTitle?: string
  onBack?: React.MouseEventHandler
}

export const UploadFailed: React.FC<UploadFailedProps> = (props: UploadFailedProps) => {
  const { onBack, ...resultProps } = props

  return (
    <Result status={'error'} {...resultProps} extra={[
      <Button onClick={onBack} key="back">返回</Button>,
    ]} />
  )
}
