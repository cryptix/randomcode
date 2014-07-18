package main

import (
	"github.com/gopherjs/gopherjs/js"
)

func main() {
	js.Global.Set("myLibrary", map[string]interface{}{
		"someFunction": someFunction,
	})
}

type myStruct struct {
	Field1 string
	Field2 int
}

func someFunction() {
	s := myStruct{"Hello", 42}
	println("structs:", s)
}
