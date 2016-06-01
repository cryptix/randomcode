package main

func worker(start chan struct{}) {
	<-start
	// do stuff...
}

func main() {
	start := make(chan struct{})

	for i := 0; i < 100; i++ {
		go worker(start)
	}

	close(start)
	// all workers are running now
}
