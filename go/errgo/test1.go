package main

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"gopkg.in/errgo.v1"
)

func main() {
	rand.Seed(time.Now().UnixNano())
	fmt.Println("hi")
	for i := 0; i < 10; i++ {
		err := errCall()
		log.Println(err)
		if err != nil {
			log.Println("Cause:", errgo.Cause(err))
			log.Println("Det:", errgo.Details(err))
		}
	}
}

func errCall() error {
	if err := maybe(); err != nil {
		return errgo.Notef(err, "maybe() failed")
	}
	return nil
}

func maybe() error {
	n := rand.Int()
	switch {
	case n%2 == 0:
		return errgo.New("yep:2")
	case n%3 == 0:
		return errgo.New("yep:3")
	}
	return nil
}
