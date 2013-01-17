package main

import (
  "fmt"
  "runtime"
)

func main() {
  fmt.Print("Go runs on ")
  
  switch os := runtime.GOOS; os {
    case "darwin":
      fmt.Println("OSX.")
    case "linux":
      fmt.Println("Linux.")
    default:
      fmt.Printf("%s.\n", os)
  }

  fmt.Print("On architecture: ")
  switch arch := runtime.GOARCH; arch {
    default:
      fmt.Printf("%s.\n", arch)
  }
}
