package main

import "fmt"

func main() {
	c := make(chan int, 3)
	c <- 23
	c <- 42
	c <- 7
	close(c)

	for i := 0; i < 4; i++ {
		d, ok := <-c
		fmt.Printf("%d %v\n", d, ok)
	}

}
