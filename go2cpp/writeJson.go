package main

import (
	"encoding/json"
	"os"
	"time"
)

type MovePlaneCommand struct {
	Y, Z        float64
	Alpha, Beta float64
}

type RunJobCommand struct {
	JobNo    int
	FileName string
}

func main() {
	var err error

	enc := json.NewEncoder(os.Stdout)

	err = enc.Encode(MovePlaneCommand{10, 20, 5, 2.5})
	checkErr(err)

	err = enc.Encode(RunJobCommand{502, "scan1.xyz"})
	checkErr(err)

	time.Sleep(time.Second * 3)

	err = enc.Encode(MovePlaneCommand{0, 25, -5, 10})
	checkErr(err)

	err = enc.Encode(RunJobCommand{505, "scan2.xyz"})
	checkErr(err)

	time.Sleep(time.Second * 3)
}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
