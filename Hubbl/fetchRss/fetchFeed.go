package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
)

type RssItem struct {
	XMLName xml.Name `xml:"item"`
	Title   string   `xml:"title"`
	Link    string   `xml:"link"`
	Descr   string   `xml:"description"`
}

var feedUrl string = "http://blog.fefe.de/rss.xml?html"

//1: fetch feedUrl - done
//2: use encoding/xml to unmarshall the feed.

func main() {
	resp, err := http.Get(feedUrl)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close() // be a nice gofer and close the body

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Body: %#v", body)

}
