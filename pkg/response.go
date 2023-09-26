package response

import (
	"github.com/gofiber/fiber/v2"
	"time"
)

type Result[T interface{}] struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data T      `json:"data"`
}

func Success[T interface{}](data T, ctx *fiber.Ctx) Result[T] {
	return Result[T]{
		Code: 200,
		Msg:  "请求成功",
		Data: data,
	}
}

func Fail(msg string, ctx *fiber.Ctx) Result[fiber.Map] {
	return Result[fiber.Map]{
		Code: 1000,
		Msg:  msg,
		Data: fiber.Map{
			"timestamp": time.Now().UnixMilli(),
			"path":      ctx.Path(),
		},
	}
}

func Failf() {

}
