package main

import (
	"fmt"
	"math"
	"os"
	"strconv"
)

func main() {
	if len(os.Args) != 3 {
		fmt.Fprintf(os.Stderr, "Usage: sinusgen <ArrSize> <Bits>\n")
		os.Exit(1)
	}

	N, err := strconv.ParseFloat(os.Args[1], 64)
	checkErr(err)
	Bits, err := strconv.ParseFloat(os.Args[2], 64)
	checkErr(err)

	var x, step float64 = 0, math.Pi / (2 * N)

	fmt.Printf("const int<%.0f> SinusRom[%.0f] = {", Bits, N)
	for n := 0.0; n < N; n += 1 {
		y := math.Pow(2, Bits-1) * math.Sin(x)

		// fmt.Printf("%3d %2x %3d %.3f\n", n, int(y), int(y), y)
		fmt.Printf("0x%x, ", int(y))

		x += step
	}
	fmt.Println("};")
}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
