package main

import (
  "fmt"
  "os"
  "io/ioutil"
  "net/http"
)

func main() {
  resp, err := http.Get("http://www.zygrib.org/noaa/getGfsRunLog.php")
  if err != nil {
    fmt.Fprint(os.Stderr, "Get Error - ", err)
    os.Exit(-1)
  }

  body, err := ioutil.ReadAll(resp.Body)
  if err != nil {
    fmt.Fprint(os.Stderr, "Body Read Error - ", err)
    os.Exit(-1)
  }
  resp.Body.Close()

  fmt.Printf("%s\n",body)

  os.Exit(0)
}
