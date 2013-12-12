package main

import (
	"image"
	"image/color"
)

type Canvas struct {
	image.RGBA
}

func NewCanvas(r image.Rectangle) *Canvas {
	canvas := new(Canvas)
	canvas.RGBA = *image.NewRGBA(r)
	return canvas
}

func (c Canvas) Clone() *Canvas {
	clone := NewCanvas(c.Bounds())
	copy(clone.Pix, c.Pix)
	return clone
}

func (c Canvas) DrawGradient() {
	size := c.Bounds().Size()
	for x := 0; x < size.X; x += 1 {
		for y := 0; y < size.Y; y += 1 {
			col := color.RGBA{
				uint8(255 * x / size.X),
				uint8(255 * y / size.Y),
				155,
				255,
			}
			c.Set(x, y, col)
		}
	}
}

func (c Canvas) DrawLine(col color.RGBA, from, to Vector) {
	delta := to.Sub(&from)
	length := delta.Length()

	x_step, y_step := delta.X/length, delta.Y/length
	limit := int(length + 0.5)

	for i := 0; i < limit; i += 1 {
		x := from.X + float64(i)*x_step
		y := from.Y + float64(i)*y_step
		c.Set(int(x), int(y), col)
	}
}

func (c Canvas) DrawSpiral(col color.RGBA, where Vector) {
	dir := Vector{0, 5}
	last := where
	for i := 0; i < 10000; i += 1 {
		next := last.Add(&dir)
		c.DrawLine(col, last, next)
		dir.Rotate(0.03)
		dir.Scale(0.999)
		last = next
	}
}

func (c Canvas) Blur(radius int) {
	clone := c.Clone()
	size := c.Bounds().Size()

	for x := 0; x < size.X; x += 1 {
		for y := 0; y < size.Y; y += 1 {
			col := c.BlurPixel(x, y, radius)
			clone.Set(x, y, col)
		}
	}

	copy(c.Pix, clone.Pix)
}

func (c Canvas) BlurPixel(x, y, radius int) color.Color {
	weightSum := float64(0)

	outR, outG, outB := float64(0), float64(0), float64(0)
	for i := x - radius; i < x+radius+1; i += 1 {
		for j := y - radius; j < y+radius+1; j += 1 {
			r, g, b, _ := c.At(i, j).RGBA()
			outR += float64(r)
			outG += float64(g)
			outB += float64(b)
			weightSum += 1
		}
	}

	return color.RGBA{
		uint8(outR / (weightSum * 0xFF)),
		uint8(outG / (weightSum * 0xFF)),
		uint8(outB / (weightSum * 0xFF)),
		255}
}
