package main

import (
  "fmt"
  "math"
)

func Sqrt(x float64) float64 {
  var z, zOld float64 = 1, 0

  var i int = 0;

  for  {
    z = z - (z*z - x) / (2*z)

    if ( math.Abs(z - zOld) < 1e-10) {

      fmt.Printf("iter: %d\n", i);
      return z

    } else {

      zOld = z
      i++

    }
  }

  return z
}

func main() {
  fmt.Printf("sqrt(2) == %f\n", Sqrt(2))
}
