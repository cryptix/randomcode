package main

import (
	"fmt"
	"io/ioutil"

	"github.com/jbenet/go-base58"
)

func main() {
	b, err := ioutil.ReadFile("/tmp/randData")
	check(err)

	fmt.Println(base58.Encode(b))
}

func check(err error) {
	if err != nil {
		panic(err)
	}
}
