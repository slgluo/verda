package utils

import (
	"bufio"
	"io"
	"os"
	"path/filepath"
)

// PathExists 判断所给路径文件、文件夹是否存在
func PathExists(path string) bool {
	_, err := os.Stat(path)
	if err != nil {
		if os.IsExist(err) {
			return true
		}
		return false
	}
	return true
}

// IsDir 判断所给路径是否为文件夹
func IsDir(path string) bool {
	s, err := os.Stat(path)
	if err != nil {
		return false
	}
	return s.IsDir()
}

func IsFile(path string) bool {
	return !IsDir(path)
}

func Copy(from, to string) error {
	if IsDir(from) {
		list, err := os.ReadDir(from)
		if err == nil {
			for _, item := range list {
				err = Copy(filepath.Join(from, item.Name()), filepath.Join(to, item.Name()))
				if err != nil {
					return err
				}
			}
		} else {
			return err
		}
	} else {
		p := filepath.Dir(to)
		if _, err := os.Stat(p); err != nil {
			if err := os.MkdirAll(p, 0777); err != nil {
				return err
			}
		}
		file, err := os.Open(from)
		if err != nil {
			return err
		}
		defer file.Close()
		buffReader := bufio.NewReader(file)

		out, err := os.Create(to)
		if err != nil {
			return err
		}
		defer out.Close()

		_, err = io.Copy(out, buffReader)
		if err != nil {
			return err
		}
	}
	return nil
}
