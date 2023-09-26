package verdaccio

import (
	"github.com/pkg/errors"
	"github.com/samber/lo"
	"gopkg.in/yaml.v3"
	"os"
	"path/filepath"
	"verda/utils"
)

type Config struct {
	Storage string `yaml:"storage"`
}

const ConfigFile = "config.yaml"
const AppDirname = "verdaccio"

var config *Config

func GetHome() (string, error) {
	var dir = os.Getenv("XDG_CONFIG_HOME")
	if dir == "" {
		dir = os.Getenv("HOME")
		if dir == "" {
			return "", errors.New("neither $XDG_CONFIG_HOME nor $HOME are defined")
		}
		dir += "/.config"
	}
	return filepath.Join(dir, AppDirname), nil
}

// GetConfig 获取 verdaccio config
func GetConfig() (*Config, error) {
	verdaccioHome, err := GetHome()
	if err != nil {
		return nil, errors.WithMessage(err, "无法获取verdaccio home")
	}
	content, err := os.ReadFile(filepath.Join(verdaccioHome, ConfigFile))
	if err != nil {
		return nil, errors.Wrapf(err, "无法读取verdaccio %s", ConfigFile)
	}

	if config == nil {
		config = &Config{}
		unmarshalErr := yaml.Unmarshal(content, config)
		if unmarshalErr != nil {
			return nil, errors.Wrapf(unmarshalErr, "无法解析verdaccio %s", ConfigFile)
		}
		return config, nil
	}
	return config, nil
}

func GetStoragePath() (string, error) {
	storagePath := os.Getenv("VERDACCIO_STORAGE_PATH")
	if storagePath == "" {
		config, err := GetConfig()
		if err != nil {
			return "", errors.WithMessage(err, "无法获取 verdaccio config")
		}
		storage := config.Storage
		if filepath.IsAbs(storage) {
			storagePath = storage
		} else {
			vh, err := GetHome()
			if err != nil {
				return "", errors.WithMessage(err, "无法获取verdaccio home")
			}
			storagePath = filepath.Join(vh, storage)
		}
	}
	if !utils.PathExists(storagePath) {
		return "", errors.New("路径不存在：" + storagePath)
	}
	return storagePath, nil
}

func GeStoragePackages() ([]string, error) {
	storagePath, err := GetStoragePath()
	if err != nil {
		return nil, errors.WithMessage(err, "无法获取storage path")
	}
	dirs, err := os.ReadDir(storagePath)
	if err != nil {
		return nil, errors.Wrapf(err, "无法读取 storage path：%s", storagePath)
	}
	packages := lo.Map(dirs, func(item os.DirEntry, _ int) string {
		return item.Name()
	})
	return packages, nil
}
