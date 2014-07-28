package main

import (
	"fmt"
	"net/http"
)

type work struct {
	url  string
	resp chan *http.Response
}

func getter(w chan work) {
	for {
		do := <-w
		resp, _ := http.Get(do.url)
		do.resp <- resp
	}
}

func main() {
	w := make(chan work)

	go getter(w)

	resp := make(chan *http.Response)
	w <- work{"http://...jquery.min.js", resp}

	r := <-resp
	fmt.Println("Code:", r.StatusCode)

}
