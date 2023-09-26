import React, { useState } from 'react'
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface'
import { Button, Modal, Spin, Upload, message } from 'antd'
import { InboxOutlined, LoadingOutlined } from '@ant-design/icons'
import { BusinessError, request } from '@/http'
import { useComputeFileMD5 } from '@/hooks/use-compute-file-md5'
import { PatchResult } from '@/const'

export interface UploadActionProps {
  onPatch?: (patchResult: number, message: string) => void
}

const { Dragger } = Upload

const ThemeColor = 'rgb(22, 119, 255)'

export const UploadAction: React.FC<UploadActionProps> = (props) => {
  const [uploadFile, setUploadFile] = useState<UploadFile>()
  const [progressTip, setProgressTip] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const patchStorage = (
    filename: string,
    fileList: string[],
    md5: string,
  ): Promise<boolean> => {
    return request<boolean>('api/storage/patch', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename, fileList, md5 }),
    })
  }

  const buildUploadAction = (chunk: {
    index: number
    chunkFile: Blob
    chunkSize: number
  }): Promise<{ filename: string }> => {
    const form = new FormData()
    form.append('index', `${chunk.index}`)
    form.append('chunkSize', `${chunk.chunkSize}`)
    form.append('chunkFile', chunk.chunkFile)
    return request('api/storage/upload', {
      method: 'post',
      body: form,
    })
  }

  const [msg, contextHolder] = message.useMessage()
  const { computeMD5 } = useComputeFileMD5()
  const { onPatch } = props

  const handleUploadClick = async () => {
    if (!uploadFile) {
      msg.error('请选择文件')
      return
    }

    const chunkSize = 5 * 1024 * 1024

    const file = uploadFile as RcFile
    const chunkCount = Math.ceil(file.size / chunkSize)
    const actions = []
    for (let i = 0; i < chunkCount; i++) {
      const start = i * chunkSize
      const chunkData = file.slice(start, start + chunkSize)
      actions.push(
        buildUploadAction({
          index: i,
          chunkFile: chunkData,
          chunkSize: chunkData.size,
        }),
      )
    }

    setIsModalOpen(true)
    const fileList = []
    try {
      setProgressTip('正在上传...')
      const result = await Promise.all(actions)
      for (const data of result) fileList.push(data.filename)
    }
    catch (error) {
      const statusText = '上传文件失败'
      onPatch?.(PatchResult.FAIL, statusText)

      setIsModalOpen(false)
      msg.error(statusText)
      return
    }

    try {
      setProgressTip('正在校验文件...')
      const md5 = await computeMD5(file, chunkSize)

      setProgressTip('正在合并依赖...')
      const patchSuccess = await patchStorage(file.name, fileList, md5)
      if (patchSuccess)
        onPatch?.(PatchResult.SUCCESS, '合并依赖成功')

      else
        onPatch?.(PatchResult.FAIL, '合并依赖失败')
    }
    catch (error) {
      if (error instanceof BusinessError) {
        msg.error(error.message)
        onPatch?.(PatchResult.FAIL, error.message)
      }
      else {
        msg.error('合并依赖失败')
        onPatch?.(PatchResult.FAIL, '合并依赖失败')
      }
    }
    finally {
      setIsModalOpen(false)
    }
  }

  const uploadProps: UploadProps = {
    showUploadList: false,
    beforeUpload: (file) => {
      if (file.type !== 'application/zip') {
        msg.error('只能上传zip文件格式')
        return false
      }
      setUploadFile(file)
      return false
    },
    accept: '.zip',
  }

  return (
    <>
      {contextHolder}
      <Dragger {...uploadProps} className="w-[36rem] h-[12rem]">
        {!uploadFile
          ? (
          <InboxOutlined className="text-6xl" style={{ color: ThemeColor }} />
            )
          : (
          <span className="text-blue text-lg">{uploadFile.name}</span>
            )}

        <div>点击或拖拽文件到区域内上传</div>
      </Dragger>

      <Button
        className="w-[8rem] h-[2.5rem] mt-4"
        type={'primary'}
        shape={'round'}
        onClick={handleUploadClick}
      >
        上传
      </Button>

      <Modal
        open={isModalOpen}
        centered={true}
        footer={null}
        closeIcon={false}
        width={'14rem'}
        maskClosable={false}
      >
        <div className="flex items-center content-center p-y-8 p-x-4">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} />} />
          <span className="ml-5">{progressTip}</span>
        </div>
      </Modal>
    </>
  )
}
