package main

import (
	"errors"
	"log"
	"os"

	"github.com/PuerkitoBio/goquery"
	"github.com/robertkrimen/otto"
)

func getMP4URL(id string) string {
	doc, err := goquery.NewDocument("https://vine.co/v/" + id)
	check(err)

	// we want the first <script> tag from the html
	firstScript := doc.Find("script").First()

	vm := otto.New()

	// otherwise window.POST_DATA will raise an reference error `ReferenceError: 'window' is not defined`
	_, err = vm.Run("var window = {};")
	check(err)

	// eval the javascript inside the <script> tag
	_, err = vm.Run(firstScript.Text())
	check(err)

	// traverse down the object path: window > POST_DATA > <videoID> > videoDashURL
	wVal, err := vm.Get("window")
	check(err)

	pdata, err := getValueFromObject(wVal, "POST_DATA")
	check(err)

	videoData, err := getValueFromObject(*pdata, id)
	check(err)

	videoDashUrl, err := getValueFromObject(*videoData, "videoDashUrl")
	check(err)

	// finally the video url...
	videoUrl, err := videoDashUrl.ToString()
	check(err)

	return videoUrl
}

func main() {
	if len(os.Args) != 2 {
		log.Fatalln("Usage: vineUrl <videoID>")
	}

	log.Println("Video URL:", getMP4URL(os.Args[1]))
}

// fatal if there is an error
func check(err error) {
	if err != nil {
		log.Fatal(err)
	}
}

func getValueFromObject(val otto.Value, key string) (*otto.Value, error) {
	if !val.IsObject() {
		return nil, errors.New("passed val is not an Object")
	}

	valObj := val.Object()

	obj, err := valObj.Get(key)
	if err != nil {
		return nil, err
	}

	return &obj, nil
}
