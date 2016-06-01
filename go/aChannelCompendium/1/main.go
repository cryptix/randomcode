package main

import (
	"fmt"
	"math/rand"
	"runtime"
	"time"
)

func from(conn chan int) {
	for {
		conn <- rand.Intn(100)
		time.Sleep(500 * time.Millisecond)
	}
}

func to(conn chan int) {
	for i := range conn {
		fmt.Printf("Someone sent me %d\n", i)
	}
}

func main() {
	cpus := runtime.NumCPU()
	runtime.GOMAXPROCS(cpus)

	conn := make(chan int)
	go from(conn)
	go to(conn)

	time.Sleep(5 * time.Second)
	close(conn)
}
