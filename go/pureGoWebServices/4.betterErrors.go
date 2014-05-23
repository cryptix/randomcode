package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type handler struct{}

type resonse struct {
	Name string
	Age  int
}

type internalServerErrorHandler struct{}

func (h *internalServerErrorHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusInternalServerError)
	fmt.Fprintf(w, "500 Inernal Server Error", err)
}

func (h handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	enc := json.NewEncoder(w)
	if err := enc.Encode(&resonse{"Juli", 18}); err != nil {
		fmt.Fprintf(w, `{"error":"%s"}`, err)
	}
}

func main() {
	http.ListenAndServe(":8080", handler{})
}
