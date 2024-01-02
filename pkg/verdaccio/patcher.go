package verdaccio

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"verda/utils"

	"github.com/pkg/errors"
	"github.com/samber/lo"
	"github.com/tidwall/pretty"
)

type PatchMessage struct {
	Pkg         string
	PatchResult string
	Total       int64
	Progress    int64
}

func PatchStorage(src string, channel chan<- PatchMessage) error {
	needPatchPackages, err := os.ReadDir(src)
	if err != nil {
		return errors.Wrapf(err, "读取patch storage目录失败：%s", src)

	}

	storagePath, err := GetStoragePath()
	if err != nil {
		return errors.WithMessagef(err, "无法获取verdaccio storage path：%s", storagePath)
	}

	var total = int64(len(needPatchPackages))
	var progress int64 = 0
	for _, pkg := range needPatchPackages {
		println("pkg=" + pkg.Name())
		srcPkg, targetPkg := filepath.Join(src, pkg.Name()), filepath.Join(storagePath, pkg.Name())
		println("src=" + srcPkg + ", target=" + targetPkg)

		pkg := pkg

		go func() {
			err = PatchPackage(srcPkg, targetPkg)

			atomic.AddInt64(&progress, 1)
			if err != nil {
				channel <- PatchMessage{
					Pkg:         pkg.Name(),
					PatchResult: "fail",
					Total:       total,
					Progress:    progress,
				}
			} else {
				channel <- PatchMessage{
					Pkg:         pkg.Name(),
					PatchResult: "success",
					Total:       total,
					Progress:    progress,
				}
			}
		}()

	}
	return nil
}

func AdjustPackage(packagePath string) error {
	var (
		pkg   *Package
		dists []string
		err   error
	)
	// 不是文件夹则忽略
	if !utils.IsDir(packagePath) {
		return nil
	}
	pkg, err = GetPackage(packagePath)
	if err != nil {
		// 读取子包目录
		if dirs, err := os.ReadDir(packagePath); err == nil {
			// 如果有子包
			if len(dirs) > 0 {
				for _, dir := range dirs {
					srcPkg := filepath.Join(packagePath, dir.Name())
					if err = AdjustPackage(srcPkg); err != nil {
						fmt.Printf("patch package [%s] 失败 <%s>\n", srcPkg, err.Error())
					}
				}
			}
			return nil
		} else {
			return errors.Wrapf(err, "读取子包目录失败：%s", packagePath)
		}
	}
	dists, err = GetLocalDistFiles(packagePath)
	if err != nil {
		return errors.WithMessagef(err, "获取获取本地依赖包发布版失败：%s", packagePath)
	}
	localVersions := GetVersions(dists)
	// 更新versions字段
	newVersions := make(map[string]interface{})
	for k, v := range pkg.Versions {
		if lo.Contains(localVersions, k) {
			newVersions[k] = v
		}
	}
	pkg.Versions = newVersions

	// 更新time字段
	newTime := make(map[string]string)
	for k, v := range pkg.Time {
		if lo.Contains(localVersions, k) {
			newTime[k] = v
		}
	}
	versionsInTime := GetSortedVersions(newTime)
	timeLen := len(versionsInTime)
	if timeLen > 0 {
		newTime["created"] = newTime[versionsInTime[timeLen-1]]
		newTime["modified"] = newTime[versionsInTime[0]]
	}
	pkg.Time = newTime

	// 更新_distfiles字段
	newDistFiles := make(map[string]DistFile)
	for k, v := range pkg.DistFiles {
		if lo.Contains(dists, k) {
			newDistFiles[k] = v
		}
	}
	pkg.DistFiles = newDistFiles

	// 更新_attachment字段
	newAttachments := make(map[string]Attachment)
	for k, v := range pkg.Attachments {
		if lo.Contains(dists, k) {
			newAttachments[k] = v
		}
	}
	pkg.Attachments = newAttachments

	// 更新 dist-tags字段（由于无法从版本号中判断出除latest之外的标签，其他标签的更新会有问题）
	newDistTags := make(map[string]string)
	for k, v := range pkg.DistTags {
		if k == "latest" {
			newDistTags[k] = GetVersionFromDistFile(GetLatestDist(dists))
		} else if lo.Contains(localVersions, v) {
			newDistTags[k] = v
		}
	}
	pkg.DistTags = newDistTags

	// 格式化后保存
	content, err := json.Marshal(pkg)
	if err != nil {
		return errors.Wrapf(err, "反序列化失败")
	}
	// 格式化
	content = pretty.Pretty(content)
	packageJsonPath := filepath.Join(packagePath, "package.json")
	// 覆盖内容
	err = os.WriteFile(packageJsonPath, content, 0777)
	if err != nil {
		return errors.Wrapf(err, "格式化package后写入package.json失败：%s", packageJsonPath)
	}

	return nil
}

func mergePackageJson(src, dest string) (*Package, error) {
	var (
		srcPkg  *Package
		destPkg *Package
		err     error
	)
	srcPkg, err = GetPackage(src)
	if err != nil {
		return nil, errors.WithMessagef(err, "读取 package.json 失败：%s", src)
	}

	destPkg, err = GetPackage(dest)
	if err != nil {
		return nil, errors.WithMessagef(err, "读取 package.json 失败：%s", dest)
	}
	// 合并 versiongs
	for k, v := range srcPkg.Versions {
		destPkg.Versions[k] = v
	}

	// 合并 time
	for k, v := range srcPkg.Time {
		destPkg.Time[k] = v
	}

	// 合并 dist-tags
	for k, v := range srcPkg.DistTags {
		destPkg.DistTags[k] = v
	}

	// 合并 _distfiles
	for k, v := range srcPkg.DistFiles {
		destPkg.DistFiles[k] = v
	}

	// 合并 _attachments
	for k, v := range srcPkg.Attachments {
		destPkg.Attachments[k] = v
	}

	return destPkg, nil
}

func PatchPackage(srcPkgPath, targetPkgPath string) error {
	// 不是文件夹则忽略
	if !utils.IsDir(srcPkgPath) {
		return nil
	}
	if utils.PathExists(targetPkgPath) && !utils.IsDir(targetPkgPath) {
		return nil
	}

	var err error
	if strings.HasPrefix(filepath.Base(srcPkgPath), "@") {
		subPackages, err := os.ReadDir(srcPkgPath)
		if err != nil {
			return errors.Wrapf(err, "读取目录失败：%s", srcPkgPath)
		}
		for _, pkg := range subPackages {
			a, b := filepath.Join(srcPkgPath, pkg.Name()), filepath.Join(targetPkgPath, pkg.Name())
			err := PatchPackage(a, b)
			if err != nil {
				fmt.Printf("patch [%s -> %s] 失败 <%w>\n", filepath.Base(a), pkg, err)
			}
		}
		return nil
	}

	// 如果已经存在
	if utils.PathExists(targetPkgPath) {
		// 合并package.json
		pkg, err := mergePackageJson(srcPkgPath, targetPkgPath)
		if err != nil {
			return errors.WithMessagef(err, "合并 package.json失败: [%s -> %s]", srcPkgPath, targetPkgPath)
		}
		// 转为字符串并格式化
		content, err := json.Marshal(pkg)
		if err != nil {
			return errors.Wrapf(err, "反序列化失败")
		}
		// 格式化
		content = pretty.Pretty(content)
		// 重新保存
		packageJsonPath := filepath.Join(targetPkgPath, "package.json")
		err = os.WriteFile(packageJsonPath, content, 0777)
		if err != nil {
			return errors.Wrapf(err, "格式化package后写入package.json失败：%s", packageJsonPath)
		}

		// 读取依赖包目录，获取所有版本文件
		dists, err := os.ReadDir(srcPkgPath)
		if err != nil {
			return errors.Wrapf(err, "读取目录失败：%s", srcPkgPath)
		}
		// 遍历依赖包的所有版本
		for _, dist := range dists {
			if dist.Name() == "package.json" {
				continue
			}
			// 判断该版本是否已存在
			src := filepath.Join(srcPkgPath, dist.Name())
			dest := filepath.Join(targetPkgPath, dist.Name())
			if utils.PathExists(dest) {
				continue
			}
			// 如果不存在就复制到目标目录
			err = utils.Copy(src, dest)
			if err != nil {
				return errors.Wrapf(err, "复制 %s 失败", dist.Name())
			}
		}

		// 整理package.json
		err = AdjustPackage(targetPkgPath)
		if err != nil {
			return errors.WithMessagef(err, "整理 package.json 失败：%s", filepath.Join(targetPkgPath, "package.json"))
		}
	} else {
		// 如果不存在，拷贝到目标目录
		err = utils.Copy(srcPkgPath, targetPkgPath)
		if err != nil {
			return errors.Wrapf(err, "复制 %s 失败", filepath.Base(srcPkgPath))
		}

		err = AdjustPackage(targetPkgPath)
		if err != nil {
			return errors.WithMessagef(err, "整理 package.json 失败：%s", filepath.Join(targetPkgPath, "package.json"))
		}
	}
	return err
}
