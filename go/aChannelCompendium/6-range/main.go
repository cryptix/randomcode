package main

import "fmt"

func gen(strings chan string) {
	strings <- "Hello"
	strings <- "World"
	strings <- "Whats"
	strings <- "Up"
	close(strings)
}

func main() {
	c := make(chan string)
	go gen(c)

	for s := range c {
		fmt.Println(s)
	}
}
