package main

import (
	"bufio"
	"os/exec"
)

func main() {

	cmd := exec.Command("arcstat.py", "1")
	out, err := cmd.StdoutPipe()
	checkErr(err)

	lines := bufio.NewScanner(out)

	checkErr(cmd.Start())

}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
