package main

import (
	"errors"
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
	mux := tigertonic.NewTrieServeMux()

	mux.Handle("GET", "/foo", tigertonic.Marshaled(Foo))
	mux.Handle("POST", "/bar", tigertonic.Marshaled(Bar))

	http.ListenAndServe(":8080", mux)
}

func Foo(u *url.URL, header http.Header, req *request) (int, http.Header, *response, error) {
	return http.StatusOK, nil, &response{"juli", 18}, nil
}

func Bar(u *url.URL, header http.Header, req *request) (int, http.Header, *response, error) {
	if req.Level != 99 {
		return http.StatusBadRequest, nil, nil, errors.New("Alll LIIIEEESS")
	}
	return http.StatusOK, nil, &response{"juli", 17}, nil
}
