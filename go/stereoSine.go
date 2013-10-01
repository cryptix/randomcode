package main

import (
	"code.google.com/p/portaudio-go/portaudio"
	"math"
	"time"
)

const sampleRate = 44100

func main() {
	chk := func(err error) {
		if err != nil {
			panic(err)
		}
	}
	processor := stereoSine{440 / sampleRate, 0, 320 / sampleRate, 0}
	stream, err := portaudio.OpenDefaultStream(0, 2, sampleRate, 0, &processor)
	chk(err)
	defer stream.Close()
	chk(stream.Start())
	time.Sleep(5 * time.Second)
	chk(stream.Stop())
}

type stereoSine struct {
	stepL, phaseL float64
	stepR, phaseR float64
}

func (g *stereoSine) ProcessAudio(_, out [][]float32) {

	for i := range out[0] {
		out[0][i] = float32(math.Sin(2 * math.Pi * g.phaseL))
		_, g.phaseL = math.Modf(g.phaseL + g.stepL)

		out[1][i] = float32(math.Sin(2 * math.Pi * g.phaseR))
		_, g.phaseR = math.Modf(g.phaseR + g.stepR)
	}
}
