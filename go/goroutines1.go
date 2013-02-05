package main

import (
	"fmt"
	"time"
)

func say(text string, secs int) {
	time.Sleep(time.Duration(secs) * time.Second)
	fmt.Println(text)
}

func main() {
	go say("let's go!", 3)
	go say("Ho!", 2)
	go say("Hey!", 1)
	time.Sleep(4 * time.Second)
}
