package main

import (
	"fmt"
	"io"
	"os"
	"syscall"
)

const (
	filename = "/tmp/test1"
)

func main() {
	buf := make([]byte, 2048)
	err := syscall.Mkfifo(filename, syscall.S_IFIFO|0666)
	if err != nil {
		panic(err)
	}

	inPipe, err := os.Open(filename)
	if err != nil {
		panic(err)
	}

	for {
		n, err := inPipe.Read(buf)
		if err != nil && err != io.EOF {
			panic(err)
		}
		if err == io.EOF {
			fmt.Printf("Read(%d): %s\n", n, string(buf))
			os.Exit(0)
		}
	}
}
