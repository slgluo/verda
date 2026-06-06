package storage

import (
	"bufio"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	response "verda/pkg"
	"verda/pkg/verdaccio"
	"verda/utils"

	"github.com/gofiber/fiber/v2/log"
	"github.com/pkg/errors"

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

func AdjustStorageHandler(ctx *fiber.Ctx) error {
	ctx.Set("Content-Type", "text/event-stream")
	ctx.Set("Cache-Control", "no-cache")
	ctx.Set("Connection", "keep-alive")

	channel := make(chan verdaccio.AjustMessage)
	err := verdaccio.AdjustStorage(channel)

	if err != nil {
		return errors.WithMessage(err, "整理storage失败")
	}

	ctx.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		for msg := range channel {
			p := float64(msg.Progress) / float64(msg.Total) * 100
			log.Debugf("[%.2f%%] adjust %s %s\n", p, msg.Pkg, msg.AdjustResult)

			data := fmt.Sprintf(`{"pkg":"%s","result":"%s","progress":%d,"total":%d}`,
				msg.Pkg, msg.AdjustResult, msg.Progress, msg.Total)
			fmt.Fprintf(w, "data: %s\n\n", data)
			w.Flush()

			if msg.Total == msg.Progress {
				close(channel)
			}
		}

		fmt.Fprintf(w, "event: done\ndata: {}\n\n")
		w.Flush()
	})

	return nil
}

// ListStoragePackagesHandler 分页获取 verdaccio storage 下的包，支持模糊查询包名
func ListStoragePackagesHandler(ctx *fiber.Ctx) error {
	// 查询参数
	pageStr := ctx.Query("page", "1")
	pageSizeStr := ctx.Query("pageSize", "20")
	keyword := ctx.Query("keyword", "")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 {
		pageSize = 20
	}

	// 获取全部包名（含 scope）
	all, err := verdaccio.GeStorageAllPackages()
	if err != nil {
		return errors.WithMessage(err, "获取包列表失败")
	}

	// 模糊过滤（不区分大小写）
	var filtered []string
	if keyword = strings.TrimSpace(keyword); keyword != "" {
		kw := strings.ToLower(keyword)
		for _, name := range all {
			if strings.Contains(strings.ToLower(name), kw) {
				filtered = append(filtered, name)
			}
		}
	} else {
		filtered = all
	}

	// 分页
	total := len(filtered)
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	itemsNames := filtered[start:end]

	storagePath, err := verdaccio.GetStoragePath()
	if err != nil {
		return errors.WithMessage(err, "获取 storage 路径失败")
	}

	var items []verdaccio.PackageSummary
	for _, name := range itemsNames {
		pkgPath := filepath.Join(storagePath, name)
		pkg, err := verdaccio.GetPackage(pkgPath)
		if err != nil {
			log.Errorf("获取包信息失败 %s: %v", name, err)
			items = append(items, verdaccio.PackageSummary{Name: name})
			continue
		}
		items = append(items, pkg.GetSummary())
	}

	return ctx.JSON(response.Success(fiber.Map{
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
		"items":    items,
	}, ctx))
}

// GetStoragePackageHandler 获取 storage 下某个包的完整详情（含 versions、dist-tags、time、readme 等）
// 路径示例：/api/storage/packages/lodash 或 /api/storage/packages/@vue%2Freactivity
func GetStoragePackageHandler(ctx *fiber.Ctx) error {
	raw := ctx.Params("+")
	if raw == "" {
		return errors.New("包名不能为空")
	}

	name, err := url.QueryUnescape(raw)
	if err != nil {
		name = raw
	}
	// 防止越权访问
	if strings.Contains(name, "..") {
		return errors.New("非法的包名")
	}

	storagePath, err := verdaccio.GetStoragePath()
	if err != nil {
		return errors.WithMessage(err, "获取 storage 路径失败")
	}

	pkgPath := filepath.Join(storagePath, name)
	if !utils.PathExists(pkgPath) {
		return errors.New("包不存在：" + name)
	}

	pkg, err := verdaccio.GetPackage(pkgPath)
	if err != nil {
		return errors.WithMessage(err, "获取包信息失败")
	}

	dependents, err := verdaccio.GetDependents(name)
	if err != nil {
		log.Errorf("获取依赖方失败 %s: %v", name, err)
		dependents = []string{}
	}

	dists, _ := verdaccio.GetLocalDistFiles(pkgPath)

	return ctx.JSON(response.Success(fiber.Map{
		"package":    pkg,
		"dependents": dependents,
		"distFiles":  dists,
	}, ctx))
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
