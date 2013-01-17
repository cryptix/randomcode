package main

import (
	"fmt"
	"math"
)

type ErrNegativeSqrt float64

func (e ErrNegativeSqrt) Error() string {
	return fmt.Sprintf("cannot Sqrt negative number: %g", e)
}

func Sqrt(x float64) (float64, error) {

  if x < 0 {
    return 0, ErrNegativeSqrt(x)
  }

  var z, zOld float64 = 1, 0
  for  {
    z = z - (z*z - x) / (2*z)

    if ( math.Abs(z - zOld) < 1e-10) {
      return z, nil
    } else {
      zOld = z
    }
  }
  
  return z, nil
}

func main() {
	fmt.Println(Sqrt(2))
	fmt.Println(Sqrt(-2))
}