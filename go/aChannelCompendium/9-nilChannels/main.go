package main

import (
	"fmt"
	"math/rand"
	"time"
)

func controller(c1, c2 chan int) {
	var ok bool
	var x int

	for {
		select {
		case x, ok = <-c1:
			if !ok {
				fmt.Println("turn off case 1")
				c1 = nil
			}
			x *= x

		case x, ok = <-c2:
			if !ok {
				fmt.Println("turn off case 2")
				c2 = nil
			}
			x -= x
		}

		fmt.Println("X:", x)

		if c1 == nil && c2 == nil {
			fmt.Println("done")
			return
		}
	}
}

func main() {
	c1 := make(chan int)
	c2 := make(chan int)

	go controller(c1, c2)

	go func() {
		for i := 0; i < 10; i++ {
			c1 <- rand.Intn(100)
			time.Sleep(2 * time.Second)
		}
	}()

	go func() {
		for i := 0; i < 10; i++ {
			c1 <- rand.Intn(10)
			time.Sleep(1 * time.Second)
		}
	}()

	time.Sleep(10 * time.Second)
	close(c2)

	time.Sleep(10 * time.Second)
	close(c1)

	time.Sleep(1 * time.Second)
}
