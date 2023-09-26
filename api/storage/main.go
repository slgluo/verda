package storage

import (
	"github.com/gofiber/fiber/v2"
)

func Register(api fiber.Router) {
	storage := api.Group("/storage")

	storage.Post("/upload", UploadHandler)
	storage.Post("/patch", PatchHandler)
}
