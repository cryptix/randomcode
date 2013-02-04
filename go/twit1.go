package main

import (
	"github.com/araddon/httpstream"
)

func main() {
	stream := make(chan []byte)
	done := make(chan bool)

	httpstream.SetLogger(log.New(os.Stdout, "", log.Ldate|log.Ltime|log.Lshortfile), *logLevel)

	client := httpstream.NewBasicAuthClient("oObsi", "Alloh!123-twitter.com", func(line []byte) {
		stream <- line
	})
	println("authed")

	err := client.Sample(done)
	if err != nil {
		httpstream.Log(httpstream.ERROR, err.Error())
	} else {
		println("starting sample stream")
		go func() {
			for line := range stream {
				println(string(line))
			}
		}()

		_ = <-done
	}
}
