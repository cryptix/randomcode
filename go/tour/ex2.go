package main

import (
  "fmt"
  "strings"
)

func WordCount(s string) map[string]int {
  m := make(map[string]int)

  for _, word := range strings.Fields(s) {
    v, ok := m[word]

    if(ok == false) {
      m[word] = 1
    } else {
      m[word] = v + 1
    }

  }

  return m
}


func main() {
  s := "here is some test string! some words come twice here"

  fmt.Printf("%+v\n", WordCount(s))
}
