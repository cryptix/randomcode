package main

import (
	"fmt"
	"io"
	"net"
	"os"
)

func main() {
	pid := os.Args[1]

	conn, err := net.Dial("unix", "/tmp/debug-"+pid+".sock")
	check(err)

	fmt.Fprintln(conn, "*")
	for {
		_, err := io.Copy(os.Stdout, conn)
		if err == io.EOF {
			break
		} else {
			check(err)
		}
	}
}

func check(err error) {
	if err != nil {
		panic(err)
	}
}
