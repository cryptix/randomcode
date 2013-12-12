package main

import (
	"image"
	"image/png"
	"log"
	"os"
)

func main() {
	width, height := 128, 128
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	out_fname := "blank.png"
	out_file, err := os.Create(out_fname)
	if err != nil {
		log.Fatal(err)
	}
	defer out_file.Close()

	log.Println("Saving image to: ", out_fname)
	png.Encode(out_file, img)
}
