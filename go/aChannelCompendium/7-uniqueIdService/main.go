package main

import "fmt"

func idService(idChan chan string) {
	var counter int64
	for {
		idChan <- fmt.Sprintf("%x", counter)
		counter++
	}
}

func main() {
	ids := make(chan string)
	go idService(ids)

	for i := 0; i < 16; i++ {
		fmt.Println("New ID:", <-ids)
	}

}
