package utils

import (
	"bytes"
	"crypto/md5"
	"encoding/hex"
	"io"
	"os"
)

func FileMD5(path string) string {
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer file.Close()

	hash, buf := md5.New(), make([]byte, 1<<20)
	for {
		n, err := file.Read(buf)
		if n == 0 {
			if err == nil {
				continue
			}
			if err == io.EOF {
				break
			}
			return ""
		}

		io.Copy(hash, bytes.NewReader(buf[:n]))
	}

	return hex.EncodeToString(hash.Sum(nil))
}
