import { Modal } from 'antd'
import React, { useCallback, useState } from 'react'
import { PatchResult } from '@/const'
import { UploadAction } from './upload-action'
import { UploadFailed } from './upload-failed'
import { UploadSuccess } from './upload-success'

export interface PackageUploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export const PackageUploadModal: React.FC<PackageUploadModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [patchResult, setPatchResult] = useState(PatchResult.DEFAULT)
  const [tip, setTip] = useState('')

  const handlePatch = useCallback((result: number, message: string) => {
    setPatchResult(result)
    setTip(message)
    if (result === PatchResult.SUCCESS)
      onSuccess()
  }, [onSuccess])

  const handleBack = useCallback(() => {
    setPatchResult(PatchResult.DEFAULT)
  }, [])

  const handleCancel = useCallback(() => {
    onClose()
    setPatchResult(PatchResult.DEFAULT)
    setTip('')
  }, [onClose])

  return (
    <Modal
      title="上传"
      open={open}
      centered
      onCancel={handleCancel}
      footer={null}
      destroyOnHidden
      width={704}
    >
      <div className="w-full flex flex-col items-center justify-center">
        {patchResult === PatchResult.DEFAULT
          ? (
              <UploadAction onPatch={handlePatch} />
            )
          : patchResult === PatchResult.SUCCESS
            ? (
                <UploadSuccess onBack={handleBack} />
              )
            : patchResult === PatchResult.FAIL
              ? (
                  <UploadFailed title={tip} onBack={handleBack} />
                )
              : null}
      </div>
    </Modal>
  )
}
