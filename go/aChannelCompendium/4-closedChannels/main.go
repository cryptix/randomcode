package main

import "fmt"

func zeroVal() {
	c := make(chan bool)
	close(c)
	x := <-c
	fmt.Printf("zeroVal: %#v\n", x)
}

func withOk() {
	c := make(chan bool)
	close(c)
	x, ok := <-c
	fmt.Printf("withOk: %#v %#v \n", x, ok)
}

func blowUp() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("blowUp Recoverd:", r)
		}
	}()
	c := make(chan bool)
	close(c)
	c <- true
}

func main() {
	zeroVal()
	withOk()
	blowUp()
}
