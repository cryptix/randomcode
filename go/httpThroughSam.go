package main

import (
	"bufio"
	"github.com/cryptix/goSam"
	"io"
	"log"
	"os"
)

func main() {
	sam, err := goSam.NewDefaultClient()
	checkErr(err)

	log.Println("Client Created")

	err = sam.Hello()
	checkErr(err)

	log.Println("Hello OK")

	// tr := &http.Transport{
	// 	Dial: sam.Dial,
	// }

	conn, err := sam.Dial("tcp", "zzz.i2p:80")
	checkErr(err)

	go io.Copy(os.Stdout, conn)
	buffedWriter := bufio.NewWriter(conn)

	_, err = buffedWriter.WriteString("GET / HTTP/1.1\r\n\r\n")
	checkErr(err)

	err = buffedWriter.Flush()
	checkErr(err)

	// client := &http.Client{Transport: tr}
	// resp, err := client.Get("http://stats.i2p/")
	// log.Println("Get returned", resp)
	// checkErr(err)

}

func checkErr(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
