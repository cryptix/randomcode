package main

import (
	"io"
	"net/http"
	"os"
)

type response struct {
	resp *http.Response
	url  string
}

func get(url string, r chan response) {
	if resp, err := http.Get(url); err == nil {
		r <- response{resp, url}
	}
}

func main() {
	first := make(chan response)
	urls := []string{"http://code.jqyuery.../jq.min.js",
		"http://localCdn1/jq.min.js",
		"http://ajax.googleapis/.a.sd.asd..asd/"}

	for _, url := range urls {
		go get(url, first)
	}

	r := <-first
	// do something with the response
	io.Copy(os.Stdout, r.resp.Body)
}
