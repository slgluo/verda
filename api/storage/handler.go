package storage

import (
	"github.com/gofiber/fiber/v2/log"
	"github.com/pkg/errors"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	response "verda/pkg"
	"verda/pkg/verdaccio"
	"verda/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const ChunkDir = "chunk"

func UploadHandler(ctx *fiber.Ctx) error {
	index := ctx.FormValue("index")
	chunkSize := ctx.FormValue("chunkSize")

	chunkFile, err := ctx.FormFile("chunkFile")
	if err != nil {
		return errors.Wrap(err, "无法获取 chunkFile")
	}

	if size, err := strconv.ParseInt(chunkSize, 10, 64); err != nil {
		if size != chunkFile.Size {
			return errors.New("chunk已损坏")
		}
		return errors.Wrap(err, "chunkSize 参数错误")
	}

	chunkDir, _ := filepath.Abs(ChunkDir)

	if !utils.PathExists(chunkDir) {
		if err = os.Mkdir(chunkDir, os.ModePerm); err != nil {
			return errors.Wrap(err, "无法创建chunk目录")
		}
	}

	filename := uuid.NewString() + "-" + index

	err = ctx.SaveFile(chunkFile, filepath.Join(chunkDir, filename))
	if err != nil {
		return errors.Wrapf(err, "分片 %s 保存失败", index)
	} else {
		return ctx.JSON(response.Success(fiber.Map{
			"filename": filename,
		}, ctx))
	}
}

type PatchVO struct {
	Filename string   `json:"filename"`
	FileList []string `json:"fileList" form:"fileList"`
	MD5      string   `json:"md5" form:"md5"`
}

func PatchHandler(ctx *fiber.Ctx) error {
	p := new(PatchVO)
	if err := ctx.BodyParser(p); err != nil {
		return errors.Wrap(err, "参数解析错误")
	}

	outputFile, err := mergeFile(p.Filename, p.FileList, p.MD5)
	defer outputFile.Close()
	defer os.Remove(outputFile.Name())

	if err != nil {
		return errors.WithMessage(err, "文件合并失败")
	}

	pwd, err := os.Getwd()
	if err != nil {
		return errors.Wrap(err, "无法获取当前目录")
	}

	if err = utils.Unzip(outputFile.Name(), pwd); err != nil {
		return errors.WithMessage(err, "解压失败")
	}
	patchDir := filepath.Join(pwd, "storage-patch")
	defer os.RemoveAll(patchDir)

	channel := make(chan verdaccio.PatchMessage)
	err = verdaccio.PatchStorage(patchDir, channel)

	if err != nil {
		return errors.WithMessage(err, "打补丁失败")
	}

	for msg := range channel {
		p := float64(msg.Progress) / float64(msg.Total) * 100
		log.Debugf("[%.2f%%] patch %s %s\n", p, msg.Pkg, msg.PatchResult)
		if msg.Total == msg.Progress {
			close(channel)
		}
	}

	return ctx.JSON(response.Success("打补丁成功", ctx))
}

// 合并文件
func mergeFile(filename string, fileList []string, md5 string) (*os.File, error) {
	// 对分片文件排序
	sort.SliceStable(fileList, func(i, j int) bool {
		reg := regexp.MustCompile(`\d+`)

		preMatch := reg.FindAllString(fileList[i], -1)
		currMatch := reg.FindAllString(fileList[j], -1)

		var (
			preIndex  = 0
			currIndex = 1
		)
		if len(preMatch) > 0 && len(currMatch) > 0 {
			preIndex, _ = strconv.Atoi(preMatch[len(preMatch)-1])
			currIndex, _ = strconv.Atoi(currMatch[len(currMatch)-1])
		}
		return preIndex < currIndex
	})

	chunkDir, _ := filepath.Abs(ChunkDir)
	if !utils.PathExists(chunkDir) {
		return nil, errors.New("分片文件夹不存在")
	}

	outputFilePath, _ := filepath.Abs(filename)
	outputFile, err := os.Create(outputFilePath)
	if err != nil {
		return nil, errors.Wrap(err, "创建合并文件失败")
	}

	for _, file := range fileList {
		// 合并分片
		chunkPath := filepath.Join(chunkDir, file)
		chunkFile, err := os.ReadFile(chunkPath)
		if err != nil {
			return nil, errors.Wrapf(err, "分片 %s 读取失败", file)
		}

		if _, err = outputFile.Write(chunkFile); err != nil {
			return nil, errors.Wrapf(err, "分片 %s 合并失败", file)
		}
		// 删除分片
		if err = os.Remove(chunkPath); err != nil {
			return nil, errors.Wrapf(err, "删除分片 %s 失败", file)
		}
	}

	if fileMD5 := utils.FileMD5(outputFilePath); fileMD5 != md5 {
		return nil, errors.New("文件已损坏")
	}

	return outputFile, nil
}
