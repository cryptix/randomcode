package main

import (
	"fmt"
	"time"
)

func worker(die chan bool) {
	ticker := time.Tick(500 * time.Millisecond)
	for {
		select {
		case <-ticker:
			fmt.Println("Still working")
		// .. do stuff cases
		case <-die:
			fmt.Println("ok shutting down")
			// ... do termination tasks
			die <- true
			return
		}
	}
}

func main() {
	die := make(chan bool)

	go worker(die)
	time.Sleep(5 * time.Second)

	die <- true // send shutdown
	<-die       // wait for shutdown
}
