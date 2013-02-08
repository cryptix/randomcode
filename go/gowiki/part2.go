package main

import (
	"fmt"
	"net/http"
)

func handler(rw http.ResponseWriter, req *http.Request) {
	fmt.Fprintf(rw, "Hi there, I love %s!", req.URL.Path[1:])
}

func main() {
	http.HandleFunc("/", handler)
	http.ListenAndServe(":8080", nil)
}
