package main

import "net"

func worker(msgChan chan string) {
	for {
		var msg string
		// generate message
		msgChan <- msg
	}
}

func main() {
	msgs := make(chan string)

	conn, _ := net.Dial("tcp", "example.com")

	for i := 0; i < 100; i++ {
		go worker(msgs)
	}

	for {
		msg := <-msgs
		conn.Write([]byte(msg))
	}

}
