package main

import (
  "fmt"
  "os"
  "io/ioutil"
  "net/url"
  "net/http"
)

func main() {
  // ask for file
  // ============
  params := url.Values{}
  params.Set("but", "prepfile")
  params.Add("la1", "55") // Latitude North pos, South neg
  params.Add("la2", "52")

  params.Add("lo1", "9") // Longditude West neg, East pos
  params.Add("lo2", "12")

  params.Add("tes", "2") // resolution [0.5, 1, 2]
  params.Add("hrs", "3") // hours interval [3, 6, 12, 24]
  params.Add("jrs", "1") // noumber of days [1 .. 8]

  params.Add("par", "W;P;R;C;T;H;m;M;")

  // security
  params.Add("l", "a07622b82b18524d2088c9b272bb3feeb0eb1737")
  params.Add("m", "61c9b2b17db77a27841bbeeabff923448b0f6388")
  //params.Add("tm", "") // time?
  params.Add("client", "zyGrib_mac-5.1.4") // well.. ^^

  baseUrl := fmt.Sprintf("http://www.zygrib.org/noaa/getzygribfile3.php?%s", params.Encode())

  req, err := http.NewRequest("GET", baseUrl, nil)
  req.Header.Set("UserAgent", "zyGrib_mac/5.1.1")

  resp, err := http.Do(req)
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
