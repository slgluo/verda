package start

import (
	"flag"
	"fmt"
	"github.com/gofiber/fiber/v2/log"
)

var Mode = flag.String("mode", "production", "运行模式，development-开发环境，production-生产环境")
var Port = flag.String("port", "3000", "服务监听的端口，默认为3000")
var Debug = flag.Bool("debug", false, "是否开启debug模式")

func init() {
	flag.Parse()
	if *Mode == "production" {
		log.SetLevel(log.LevelInfo)
		fmt.Print("当前为🔥生产环境🔥\n")
	} else {
		log.SetLevel(log.LevelDebug)
		fmt.Print("当前为🌲开发环境🌲\n")
	}

	if *Debug {
		log.SetLevel(log.LevelDebug)
	}
}
