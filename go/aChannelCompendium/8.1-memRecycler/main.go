package main

import (
	"container/list"
	"crypto/rand"
	"fmt"
	"time"
)

func recycler(give, get chan []byte) {
	fmt.Println("Starting recycler")

	q := new(list.List)

	for {
		if q.Len() == 0 {
			fmt.Println("Making new")
			q.PushFront(make([]byte, 5))
		}

		e := q.Front()

		select {
		case s := <-give:
			fmt.Println("got back")
			q.PushFront(s[:0])

		case get <- e.Value.([]byte):
			fmt.Println("giving")
			q.Remove(e)
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

	for i := 0; i < 10; i++ {
		go doRandom(give, get)
	}

	time.Sleep(15 * time.Second)
	close(give)
	close(get)
}
