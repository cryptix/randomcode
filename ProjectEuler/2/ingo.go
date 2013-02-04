package main

func fibonacci() func() int {

	n0, n1 := 0, 1
	return func() int {
		n0, n1 = n1, n0+n1
		return n0

	}
}

func main() {
	fib := fibonacci()
	n := 0
	sum := 0

	for n <= 4000000 {
		n = fib()
		if n%2 == 0 {
			sum += n
		}
	}

	println(sum)
}
