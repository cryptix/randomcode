package main

import (
	"fmt"
	"math"
	"time"
)

const (
	NUM = 600851475143
)

func main() {
	start := time.Now()

	limit := uint64(math.Sqrt(NUM))

	// build sieve numbers
	// more info on the sieve approach: https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes
	sieve := make([]bool, limit) // c for composite.  false means prime candidate
	sieve[1] = true              // 1 not considered prime
	p := uint64(2)
	for {
		// first allowed optimization:  outer loop only goes to sqrt(limit)
		p2 := p * p
		if p2 >= limit {
			break
		}
		// second allowed optimization:  inner loop starts at sqr(p)
		for i := p2; i < limit; i += p {
			sieve[i] = true // it's a composite

		}
		// scan to get next prime for outer loop
		for {
			p++
			if !sieve[p] {
				break
			}
		}
	}

	sieveBuild := time.Now()
	fmt.Printf("Building primes with Sieve of Eratosthenes took %v\n", sieveBuild.Sub(start))

	factors := make([]uint64, 0, 10) // append grows the slice in case there are more
	for i := uint64(1); i < limit; i += 2 {
		if !sieve[i] && NUM%i == 0 {
			factors = append(factors, i)
		}
	}

	factorsChecked := time.Now()
	fmt.Printf("Checking NUM against primes took %v\n", factorsChecked.Sub(sieveBuild))

	fmt.Printf("Factors:%v\n", factors)
}
