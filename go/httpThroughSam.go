package main

import (
	"io"
	"log"
	"net/http"
	"os"

	"github.com/cryptix/goSam"
)

func main() {
	// create a default sam client
	sam, err := goSam.NewDefaultClient()
	checkErr(err)

	log.Println("Client Created")

	tr := &http.Transport{
		Dial: sam.Dial,
	}

	client := &http.Client{Transport: tr}
	resp, err := client.Get("http://stats.i2p/")
	checkErr(err)
	defer resp.Body.Close()

	log.Printf("Get returned %+v\n", resp)

	file, err := os.Create("stats.html")
	checkErr(err)
	defer file.Close()

	_, err = io.Copy(file, resp.Body)
	checkErr(err)

	log.Println("Done.")
}

func checkErr(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
