package main

import (
	"fmt"
	"github.com/cryptix/wav"
	"os"
)

func main() {
	fmt.Println("Testing .wav writing")

	in, err := os.Create("test2.wav")
	checkErr(err)
	defer in.Close()

	_, err = wav.NewWavWriter(in, 1, 44100, 16)
	checkErr(err)

	// fmt.Println("Wav Format:", wavr)
}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
