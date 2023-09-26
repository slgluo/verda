package utils

import (
	"archive/zip"
	"github.com/pkg/errors"
	"io"
	"os"
	"path/filepath"
	"strings"
)

func Unzip(path, target string) error {
	archive, err := zip.OpenReader(path)
	if err != nil {
		return err
	}
	defer archive.Close()

	for _, f := range archive.File {
		filePath := filepath.Join(target, f.Name)

		if !strings.HasPrefix(filePath, filepath.Clean(target)+string(os.PathSeparator)) {
			return errors.New("路径解析错误")
		}
		if f.FileInfo().IsDir() {
			continue
		}

		if err := os.MkdirAll(filepath.Dir(filePath), os.ModePerm); err != nil {
			return err
		}

		dstFile, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		fileInArchive, err := f.Open()
		if err != nil {
			return err
		}

		if _, err := io.Copy(dstFile, fileInArchive); err != nil {
			return err
		}

		dstFile.Close()
		fileInArchive.Close()
	}
	return nil
}
