package main

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/rcrowley/go-tigertonic"
)

type request struct {
	Lies  bool
	Level int
}

type response struct {
	Name string
	Age  int
}

func main() {
	handler := tigertonic.Marshaled(func(u *url.URL, header http.Header, req *request) (int, http.Header, *response, error) {
		fmt.Println("Req:", req)
		return http.StatusOK, nil, &response{"juli", 18}, nil
	})

	http.ListenAndServe(":8080", handler)
}
