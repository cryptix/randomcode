package main

import (
	"fmt"
	"github.com/dchest/uniuri"
)

func main() {
	fmt.Println(uniuri.NewLen(10))
}
