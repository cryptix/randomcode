package main

import (
	"fmt"
	"math"
	"time"
)

const (
	NUM = 600851475143
)

// used this to check faster against small primes
// http://www.anyexample.com/programming/cplusplus/cplusplus_function_for_prime_number_check_(primality_test).xml
func checkPrime(x uint64) bool {
	var i uint64
	p55 := []uint64{2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257}
	for i = 0; i < 55; i++ {
		if x%p55[i] == 0 {
			if x == p55[i] {
				return true
			} else {
				return false
			}
		}
	}

	maxTest := x >> 4
	for i = 259; i < maxTest; i++ {
		if x%i == 0 {
			return false
		}
	}
	return true
}

func main() {

	start := time.Now()

	factors := make([]uint64, 0, 10) // append grows the slice in case there are more

	for i := uint64(math.Sqrt(NUM)); i > 1; i-- {
		if checkPrime(i) && NUM%i == 0 {
			factors = append(factors, i)
		}
	}
	found := time.Now()

	fmt.Printf("Checking NUM against primes took %v\n", found.Sub(start))

	fmt.Printf("Factors:%v\n", factors)
}
