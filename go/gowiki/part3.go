package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
)

const (
	viewPath = "/view/"
	lenPath  = len(viewPath)
)

type Page struct {
	Title string
	Body  []byte
}

func (p *Page) save() error {
	// TODO p.Title could be ../../../../../.bashrc :/ 
	// path.basename()?
	filename := p.Title + ".txt"
	return ioutil.WriteFile(filename, p.Body, 0600)
}

func loadPage(title string) (*Page, error) {
	filename := title + ".txt"
	body, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	return &Page{Title: title, Body: body}, nil
}

func viewHandler(rw http.ResponseWriter, req *http.Request) {
	title := req.URL.Path[lenPath:]
	p, _ := loadPage(title)
	fmt.Fprintf(rw, "<h1>%s</h1><div>%s</div>", p.Title, p.Body)
}

func main() {
	http.HandleFunc(viewPath, viewHandler)
	http.ListenAndServe(":8080", nil)
}
