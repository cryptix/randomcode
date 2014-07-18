package main

import (
	"fmt"
	"os"
	"time"

	d "github.com/visionmedia/go-debug"
)

var debug = d.Debug("pecoTest")

func main() {
	i := 0
	fmt.Println("Pid:", os.Getpid())

	for {
		debug("test %d", i)
		i++
		time.Sleep(1 * time.Second)
	}
}
