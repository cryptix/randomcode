package main

import (
	"image"
	"math"
)

type Vector struct {
	X, Y float64
}

func (v *Vector) Rotate(angle float64) {
	cos, sin := math.Cos(angle), math.Sin(angle)
	v.X, v.Y = v.X*cos+v.Y*sin, v.Y*cos-v.X*sin
}

func (v1 *Vector) Add(v2 *Vector) Vector {
	return Vector{v1.X + v2.X, v1.Y + v2.Y}
}

func (v1 *Vector) Sub(v2 *Vector) Vector {
	return Vector{v1.X - v2.X, v1.Y - v2.Y}
}

func (v *Vector) Scale(a float64) {
	v.X, v.Y = v.X*a, v.Y*a
}

func (v *Vector) Length() float64 {
	return math.Hypot(v.X, v.Y)
}

func (v *Vector) toPoint() image.Point {
	return image.Point{int(v.X), int(v.Y)}
}
