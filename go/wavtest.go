package main

import (
	"fmt"
	"github.com/cryptix/wav"
	"os"
)

func main() {
	if len(os.Args) != 2 {
		fmt.Fprintf(os.Stderr, "usage: %s <fname>\n", os.Args[0])
		os.Exit(1)
	}

	fmt.Println("Testing .wav reading")

	in, err := os.Open(os.Args[1])
	checkErr(err)
	defer in.Close()

	instat, err := in.Stat()
	checkErr(err)

	wavr, err := wav.NewWavReader(in, instat.Size())
	checkErr(err)

	fmt.Println("Wav Format:", wavr)

	os.Exit(0)
}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
