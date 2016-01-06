package main

import (
	"fmt"
	"net"
	"os"
)

func main() {

	done := make(chan struct{})

	fmt.Println("hi pid:", os.Getpid())
	l6, err := net.Listen("tcp", ":3333")
	check(err)

	fmt.Println("tcp6 addr:", l6.Addr())

	go func() {
		for {

			conn, err := l6.Accept()
			check(err)

			fmt.Fprintln(conn, "l6 accept.")
			fmt.Fprintln(conn, "raddr:", conn.RemoteAddr())
			fmt.Fprintln(conn, "laddr:", conn.LocalAddr())
			check(conn.Close())
		}
	}()

	//l4, err := net.Listen("tcp4", "[::]:3333")
	//check(err)

	//fmt.Println("tcp4 addr:", l4.Addr())

	//go func() {
	//	for {

	//		conn, err := l4.Accept()
	//		check(err)

	//		fmt.Fprintln(conn, "l4 accept.")
	//		fmt.Fprintln(conn, "raddr:", conn.RemoteAddr())
	//		fmt.Fprintln(conn, "laddr:", conn.LocalAddr())
	//		check(conn.Close())
	//	}
	//}()

	<-done
}

func check(err error) {
	if err != nil {
		panic(err)
	}
}
