package main

import (
	"encoding/xml"
	"fmt"
	"log"
	"net/http"
)

//1: fetch feedUrl - done
//2: use encoding/xml to unmarshall the feed. - done
//3: check multiple streams - done
//4: store in format for client retreival

type RssItem struct {
	Title string `xml:"title"`
	Link  string `xml:"link"`
	Guid  string `xml:"guid"`
	Descr string `xml:"description"`
}

type RssChannel struct {
	XMLName xml.Name  `xml:"channel"`
	Title   string    `xml:"title"`
	Link    string    `xml:"link"`
	Descr   string    `xml:"description"`
	Lang    string    `xml:"language"`
	Items   []RssItem `xml:"item"`
}

type RssHead struct {
	XMLName xml.Name `xml:"rss"`
	Channel RssChannel
}

// fetch and unmarshall the feed
func fetchAndUnmarshal(feedUrl string) (feed *RssHead, err error) {
	resp, err := http.Get(feedUrl)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close() // be a nice gofer and close the body

	decoder := xml.NewDecoder(resp.Body)

	//feed = RssHead{}
	err = decoder.Decode(&feed)
	if err != nil {
		return nil, err
	}

	return feed, nil
}

func main() {
	feeds := []string{
		"http://blog.fefe.de/rss.xml?html",
		"http://news.ycombinator.com/rss",
		"http://www.reddit.com/saved.rss?feed=c82505453b345a925139607cc7b08270afef58e6&user=cryp7ix"}

	for _, fUrl := range feeds {
		feed, err := fetchAndUnmarshal(fUrl)
		if err != nil {
			log.Fatal(err)
		}

		fmt.Printf("\n\n")
		fmt.Printf("Title\t%v\n", feed.Channel.Title)
		fmt.Printf("Link\t%v\n", feed.Channel.Link)
		fmt.Printf("Lang\t%v\n", feed.Channel.Lang)
		fmt.Printf("Descr.\t%v\n", feed.Channel.Descr)

		fmt.Printf("Number of Items: %d\n", len(feed.Channel.Items))

		for _, i := range feed.Channel.Items {
			fmt.Printf("\n\n")
			fmt.Printf("Title\t%v\n", i.Title)
			fmt.Printf("Link\t%v\n", i.Link)
			fmt.Printf("Descr.\t%v\n", i.Descr)
		}
	}

	fmt.Println("Done!")
}
