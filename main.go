package main

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/log"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"verda/api"
	"verda/middleware"
	response "verda/pkg"
	"verda/start"
)

func main() {
	app := fiber.New(fiber.Config{
		AppName:   "Verda",
		BodyLimit: 50 * 1024 * 1024,
		ErrorHandler: func(ctx *fiber.Ctx, err error) error {
			return ctx.JSON(response.Fail(err.Error(), ctx))
		},
	})

	app.Use(logger.New(logger.Config{
		TimeFormat: "2006-01-02 15:04:05.000", // 时间格式
	}))
	// 恐慌恢复 😱 中间件，防止程序崩溃宕机
	app.Use(recover.New())

	api.Register(app)
	middleware.Static(app)

	log.Fatal(app.Listen(":" + *start.Port))
}
