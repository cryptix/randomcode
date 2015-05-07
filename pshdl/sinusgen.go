package main

import (
	"fmt"
	"math"
)

const (
	N    = 64
	Bits = 16
)

func main() {
	var x, step float64 = 0, math.Pi / (2 * N)

	fmt.Printf("const int<%d> SinusRom[%d] = {", Bits, N)
	for n := 0; n < N; n += 1 {
		y := math.Pow(2, Bits-1) * math.Sin(x)

		// fmt.Printf("%3d %2x %3d %.3f\n", n, int(y), int(y), y)
		fmt.Printf("0x%x, ", int(y))

		x += step
	}
	fmt.Println("};")
}
