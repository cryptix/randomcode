package main

import (
	"fmt"
)

func fibs(ch chan int) {
	i, j := 0, 1
	for {
		ch <- j
		i, j = j, i+j
	}
}

func main() {
	ch := make(chan int)
	go fibs(ch)
	for i := 0; i < 20; i++ {
		fmt.Println(<-ch)
	}

}
