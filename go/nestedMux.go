package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	mainMux := http.NewServeMux()

	mainMux.Handle("/start", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "handling start")
	}))

	nestedMux := http.NewServeMux()

	nestedMux.Handle("/prefix/test", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "handling nested test")
	}))

	// passing mainMux works but I wand to augment /prefix/* with another middleware
	//thridParty.Api.Register("/prefix",nestedMux)

	mainMux.Handle("/prefix/", nestedMux)

	mainMux.Handle("/public/", http.StripPrefix("/public", http.FileServer(http.Dir("public"))))

	fmt.Println("listening...")
	check(http.ListenAndServe(":3333", mainMux))
}

func check(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
