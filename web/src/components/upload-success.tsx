import { Button, Result } from 'antd'
import React from 'react'

export interface UploadSuccessProps {
  onBack?: React.MouseEventHandler
}

export const UploadSuccess: React.FC<UploadSuccessProps> = (props: UploadSuccessProps) => {
  const { onBack } = props

  return (
    <Result status={'success'} title={'合并依赖成功'} extra={[
      <Button onClick={onBack} key="back">返回</Button>,
    ]} />
  )
}
