package main

func main() {
	sum := 0
	for i := 0; i <= 999; i++ {
		if i%3 == 0 || i%5 == 0 {
			sum += i
		}
	}

	println(sum)
}
