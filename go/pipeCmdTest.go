package main

import (
	"fmt"
	"io"
	"os"
	"os/exec"
)

func main() {
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "Usage: test <input> <output>")
		os.Exit(1)
	}

	input, err := os.Open(os.Args[1])
	check(err)
	defer input.Close()

	output, err := os.Create(os.Args[2])
	check(err)
	defer output.Close()

	cmd := exec.Command("cat")

	stdin, err := cmd.StdinPipe()
	check(err)

	stdout, err := cmd.StdoutPipe()
	check(err)

	writeDone := make(chan bool)
	readDone := make(chan bool)
	go func() {

		_, err := io.Copy(stdin, input)
		check(err)

		err = stdin.Close()
		check(err)

		writeDone <- true
	}()

	go func() {

		_, err := io.Copy(output, stdout)
		check(err)

		readDone <- true
	}()

	err = cmd.Start()
	check(err)

	<-readDone
	<-writeDone

	err = cmd.Wait()
	fmt.Println("Done")

}

func check(err error) {
	if err != nil {
		panic(err)
	}
}
