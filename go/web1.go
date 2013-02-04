package main

import (
	"github.com/hoisie/web"
)

func index() string {
	return "THis is Index!"
}

func hello(val string) string {
	return "hello " + val
}

func main() {
	web.Get("/", index)
	web.Get("/hello/(.*)", hello)
	web.Run("0.0.0.0:9999")
}
