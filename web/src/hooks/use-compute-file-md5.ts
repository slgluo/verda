import SparkMD5 from 'spark-md5'

export function useComputeFileMD5() {
  const computeMD5 = (file: File, chunkSize = 2 * 1024 * 1024) => {
    return new Promise<string>((resolve, reject) => {
      const blobSlice = File.prototype.slice
      const chunks = Math.ceil(file.size / chunkSize)
      let currentChunk = 0
      const spark = new SparkMD5.ArrayBuffer()
      const fileReader = new FileReader()

      fileReader.onload = function (e) {
        spark.append(e.target?.result as ArrayBuffer)
        currentChunk++
        if (currentChunk < chunks)
          loadNext()
        else
          resolve(spark.end())
      }

      fileReader.onerror = reject

      function loadNext() {
        const start = currentChunk * chunkSize
        const end = start + chunkSize > file.size ? file.size : start + chunkSize
        fileReader.readAsArrayBuffer(blobSlice.call(file, start, end))
      }
      loadNext()
    })
  }
  return {
    computeMD5,
  }
}
