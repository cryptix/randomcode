package main

import (
	"io"
	"net/http"
	"os"
)

func mainHandler(w http.ResponseWriter, req *http.Request) {
	file, err := os.Open("index.html")
	if err == nil {
		io.Copy(w, file)
	}
}

func main() {
	//http.HandleFunc("/", mainHandler)
	http.Handle("/", http.FileServer(http.Dir(".")))
	println("Listening on port 8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		panic("ListenAndServe: " + err.Error())
	}
}
