package main

import (
	"image"
	"image/color"
	"image/png"
	"log"
	"math/rand"
	"os"
	"time"
)

func main() {
	width, height := 1024, 512
	canv := NewCanvas(image.Rect(0, 0, width, height))

	canv.DrawGradient()

	rand.Seed(int64(time.Now().Nanosecond()))

	for i := 0; i < 50; i += 1 {
		where := Vector{rand.Float64() * float64(width), rand.Float64() * float64(height)}
		col := color.RGBA{
			uint8(rand.Intn(255)),
			uint8(rand.Intn(255)),
			uint8(rand.Intn(255)),
			128}

		canv.DrawSpiral(col, where)
	}

	out_fname := "spirals.png"
	out_file, err := os.Create(out_fname)
	if err != nil {
		log.Fatal(err)
	}
	defer out_file.Close()

	log.Println("Saving image to: ", out_fname)
	png.Encode(out_file, canv)
}
