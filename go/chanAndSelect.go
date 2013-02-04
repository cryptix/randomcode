package main

import (
	"fmt"
	"time"
)

func main() {
	ticker := time.NewTicker(time.Millisecond * 50)
	boom := time.After(time.Second * 1)

	for {
		select {
		case <-ticker.C:
			fmt.Println("tick!")
		case <-boom:
			fmt.Println("Boom!!")
			return
		}
	}
}
