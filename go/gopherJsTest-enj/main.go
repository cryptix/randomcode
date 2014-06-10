package main

import (
	"github.com/ajhager/enj"
	"math/rand"
)

var app *enj.App

type Hello struct {
	*enj.Game
	Time float32
}

func (h *Hello) Update(dt float32) {
	h.Time += dt
	if h.Time > 0.5 {
		h.Time = 0
		app.SetBgColor(byte(rand.Intn(256)), byte(rand.Intn(256)), byte(rand.Intn(256)), 255)
	}
}

func main() {
	app = enj.NewApp(800, 600, false, "example", new(Hello))
}
