package web

import "embed"

//go:embed dist/*
//go:embed dist/**/*
var Dist embed.FS
