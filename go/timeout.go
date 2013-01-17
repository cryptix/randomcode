package main

import "time"
import "fmt"

func timeouter(c chan string) {
    time.Sleep(time.Second * 2)
    c <- "result 1"
}

func main() {

  c1 := make(chan string)

  go timeouter(c1)

  select {
  case res := <-c1:
    fmt.Println(res)
  case <-time.After(time.Second * 1):
    fmt.Println("timeout 1")
  }

  c2 := make(chan string)
  go timeouter(c2)

  select {
  case res := <-c2:
    fmt.Println(res)
  case <-time.After(time.Second * 3):
    fmt.Println("timeout 2")
  }
}
