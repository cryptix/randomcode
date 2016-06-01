package main

import (
	"crypto/rand"
	"fmt"
	"time"
)

func recycler(give, get chan []byte) {
	idle := make(chan []byte, 5)
	var makes uint
	var b []byte

	for {

		select {
		case b = <-idle:

		default:
			makes++
			b = make([]byte, 5)
		}

		select {
		case s := <-give:
			fmt.Println("got back")
			idle <- s

		case get <- b:
			fmt.Println("giving. makes:", makes)
		}
	}
}

func doRandom(give, get chan []byte) {
	for {
		storj := <-get
		fmt.Printf("Got: %v\n", storj)
		rand.Read(storj)
		fmt.Printf("Wrote: %v\n", storj)
		give <- storj
		time.Sleep(1 * time.Second)
	}
}

func main() {
	give := make(chan []byte)
	get := make(chan []byte)

	go recycler(give, get)

	for i := 0; i < 2; i++ {
		go doRandom(give, get)
	}

	time.Sleep(15 * time.Second)
	close(give)
	close(get)
}
