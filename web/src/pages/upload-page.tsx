import { useCallback, useState } from 'react'
import {
  UploadAction,
  UploadFailed,
  UploadSuccess,
} from '@/components'
import { PatchResult } from '@/const'

export function UploadPage() {
  const [patchResult, setPatchResult] = useState(PatchResult.DEFAULT)
  const [tip, setTip] = useState('')

  const handlePatch = useCallback((result: number, message: string) => {
    setPatchResult(result)
    setTip(message)
  }, [setPatchResult, setTip])

  const handleBack = useCallback(() => {
    setPatchResult(PatchResult.DEFAULT)
  }, [setPatchResult])
  return (
    <>
      <div className="w-full h-full flex justify-center items-center">
        <div className="w-xl flex flex-col justify-center items-center">
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
      </div>
    </>
  )
}
