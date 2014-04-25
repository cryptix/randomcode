package main

import (
	"DST/TISLib"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"time"
)

const cmdPath = "/Users/cryptix/Documents/DST-Swiss/TIS/Cpp/JsonRunner/Debug/JsonRunner"

type RpcRequest struct {
	ReqId int
}

type MoveToCommand struct {
	RpcRequest
	Y, Z        float64
	Alpha, Beta float64
}

type RunJobCommand struct {
	RpcRequest
	FileName string
	JobNo    int
}

type Response struct {
	Message string
}

func main() {
	var (
		err     error
		running bool
	)

	cmd := exec.Command(cmdPath)

	stdout, err := cmd.StdoutPipe()
	checkErr(err)

	stdin, err := cmd.StdinPipe()
	checkErr(err)

	err = cmd.Start()
	checkErr(err)
	running = true

	go func() {
		enc := json.NewEncoder(stdin)

		err = enc.Encode(MoveToCommand{10, 20, 5, 2.5})
		checkErr(err)

		err = enc.Encode(RunJobCommand{"502.xyz", 502})
		checkErr(err)

		time.Sleep(time.Second * 3)

		err = enc.Encode(MoveToCommand{0, 25, -5, 10})
		checkErr(err)

		err = enc.Encode(RunJobCommand{"505.xyz", 505})
		checkErr(err)

		time.Sleep(time.Second * 3)

		stdin.Close()
	}()

	go func() {
		dec := json.NewDecoder(stdout)
		var r TISLib.StatusMessage

		for running {
			err = dec.Decode(&r)
			if err == io.EOF {
				break
			}
			checkErr(err)

			fmt.Println(r)
		}
	}()

	err = cmd.Wait()
	if err == io.EOF {
		os.Exit(0)
	}
	checkErr(err)
}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
