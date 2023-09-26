package api

import (
	"github.com/gofiber/fiber/v2"
	"verda/api/storage"
)

func Register(app *fiber.App) {
	api := app.Group("/api")

	storage.Register(api)
}
