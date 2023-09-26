package verdaccio

import (
	"encoding/json"
	"github.com/Masterminds/semver/v3"
	"github.com/pkg/errors"
	"github.com/samber/lo"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

type Version struct {
}

type Attachment struct {
	Shasum string `json:"shasum"`
}

type DistFile struct {
	Url      string `json:"url"`
	Sha      string `json:"sha"`
	Registry string `json:"registry"`
}

type Package struct {
	Name        string                 `json:"name"`
	Versions    map[string]interface{} `json:"versions"`
	Time        map[string]string      `json:"time"`
	Users       interface{}            `json:"users"`
	DistTags    map[string]string      `json:"dist-tags"`
	Uplinks     interface{}            `json:"_uplinks"`
	DistFiles   map[string]DistFile    `json:"_distfiles"`
	Attachments map[string]Attachment  `json:"_attachments"`
	Rev         string                 `json:"_rev"`
	Id          string                 `json:"_id"`
	Readme      string                 `json:"readme"`
}

func GetPackage(path string) (*Package, error) {
	jsonPath := filepath.Join(path, "package.json")
	content, err := os.ReadFile(jsonPath)
	if err != nil {
		return nil, errors.Wrapf(err, "无法读取package.json：%s", jsonPath)
	}
	pkg := Package{}
	err = json.Unmarshal(content, &pkg)
	if err != nil {
		return nil, errors.Wrapf(err, "无法解析package.json：%s", jsonPath)
	}
	return &pkg, nil
}

// GetLocalDistFiles 获取依赖包目录下的所有发布版
func GetLocalDistFiles(path string) ([]string, error) {
	files, err := os.ReadDir(path)
	if err != nil {
		return nil, errors.Wrapf(err, "无法读取目录：%s", path)
	}
	names := make([]string, 0)
	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".tgz") {
			names = append(names, file.Name())
		}
	}
	return names, nil
}

func GetVersions(dists []string) []string {
	reg := regexp.MustCompile(`(.+)-(\d+\.\d+\.\d+.*).tgz`)
	var versions = make([]string, 0)
	for _, dist := range dists {
		match := reg.FindStringSubmatch(dist)
		if len(match) > 1 {
			versions = append(versions, match[2])
		}
	}
	return versions
}

func GetSortedDistFiles(dists []string) []string {
	sort.SliceStable(dists, func(i, j int) bool {
		preVersion := GetVersionFromDistFile(dists[i])
		currVersion := GetVersionFromDistFile(dists[j])
		return semver.MustParse(currVersion).LessThan(semver.MustParse(preVersion))
	})
	return dists
}

func GetSortedVersions(versionMap map[string]string) []string {
	versions := lo.Keys(versionMap)
	sort.SliceStable(versions, func(i, j int) bool {
		preVer, e1 := semver.NewVersion(versions[i])
		currVer, e2 := semver.NewVersion(versions[j])
		if e1 != nil || e2 != nil {
			preTime, e3 := time.Parse(time.RFC3339Nano, versionMap[versions[i]])
			currTime, e4 := time.Parse(time.RFC3339Nano, versionMap[versions[j]])
			if e3 != nil || e4 != nil {
				return true
			} else {
				return currTime.Compare(preTime) < 0
			}
		} else {
			return currVer.LessThan(preVer)
		}
	})
	return versions
}

func GetVersionFromDistFile(dist string) string {
	reg := regexp.MustCompile(`(.+)-(\d+\.\d+\.\d+.*).tgz`)
	match := reg.FindStringSubmatch(dist)
	if len(match) == 3 {
		return match[2]
	}
	return ""
}

func GetLatestDist(dists []string) string {
	sortedDists := GetSortedDistFiles(dists)
	if len(sortedDists) > 0 {
		return sortedDists[0]
	} else {
		return ""
	}
}
