package main

import (
	"image"
	"image/color"
	"image/png"
	"log"
	"os"
)

func main() {
	width, height := 1024, 512
	canv := NewCanvas(image.Rect(0, 0, width, height))

	canv.DrawGradient()

	from := Vector{0, 0}
	col := color.RGBA{0, 0, 0, 255}

	for i := 0; i < width; i += 3 {
		to := Vector{float64(i), float64(height)}
		canv.DrawLine(col, from, to)
	}

	out_fname := "lines.png"
	out_file, err := os.Create(out_fname)
	if err != nil {
		log.Fatal(err)
	}
	defer out_file.Close()

	log.Println("Saving image to: ", out_fname)
	png.Encode(out_file, canv)
}
