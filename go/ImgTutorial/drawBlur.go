package main

import (
	"image"
	"image/draw"
	"image/jpeg"
	"log"
	"os"
)

func main() {
	inFname := "Where_Is_She_Hiding.jpg"
	file, err := os.Open(inFname)
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()

	m, _, err := image.Decode(file)
	if err != nil {
		log.Fatal(err)
	}

	canv := NewCanvas(m.Bounds())
	draw.Draw(canv, m.Bounds(), m, image.ZP, draw.Src)

	canv.Blur(9)

	out_fname := "blurred.jpg"
	out_file, err := os.Create(out_fname)
	if err != nil {
		log.Fatal(err)
	}
	defer out_file.Close()

	log.Println("Saving image to: ", out_fname)
	jpeg.Encode(out_file, canv, nil)
}
