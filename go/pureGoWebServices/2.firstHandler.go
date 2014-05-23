package main

import (
	"fmt"
	"net/http"
)

type handler struct{}

func (h handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")

	fmt.Fprintln(w, "Hello, www!")
}

func main() {

	http.ListenAndServe(":8080", handler{})
}
