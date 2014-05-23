package main

import (
	"bufio"
	"bytes"
	"log"

	"github.com/cryptix/goSam"
)

func main() {
	sam, err := goSam.NewDefaultClient()
	checkErr(err)

	sam.ToggleVerbose()

	conn, err := sam.Dial("tcp", "stats.i2p")
	checkErr(err)

	buf := bytes.NewBufferString("GET / HTTP/1.0\r\n\r\n")
	n, err := conn.Write(buf.Bytes())
	checkErr(err)

	log.Printf("Wrote %d bytes\n", n)

	reader := bufio.NewReader(conn)
	for {
		line, err := reader.ReadString('\n')
		checkErr(err)

		log.Println("Line:", line)
	}
}

func checkErr(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
