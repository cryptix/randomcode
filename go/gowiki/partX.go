package main

import (
	"html/template"
	"io/ioutil"
	"net/http"
	"regexp"
	"strings"
)

// Globals
var templates = template.Must(template.ParseFiles(templDir+"edit.tpl", templDir+"view.tpl", templDir+"index.tpl"))
var titleValidator = regexp.MustCompile("^[a-zA-Z0-9]+$")

// Page class
type Page struct {
	Title string
	Body  []byte
}

func (p *Page) save() error {
	filename := p.Title + ".txt"
	return ioutil.WriteFile(pagesDir+filename, p.Body, 0600)
}

func loadPage(title string) (*Page, error) {
	filename := title + ".txt"
	body, err := ioutil.ReadFile(pagesDir + filename)
	if err != nil {
		return nil, err
	}
	return &Page{Title: title, Body: body}, nil
}

// Handlers
const (
	templDir = "tmpl/"
	pagesDir = "data/"

	indexPath = "/view/FrontPage"
	viewPath  = "/view/"
	editPath  = "/edit/"
	savePath  = "/save/"
)

func makeHandler(fn func(http.ResponseWriter, *http.Request, string)) http.HandlerFunc {
	return func(rw http.ResponseWriter, req *http.Request) {
		// extract title and call the fn
		title := req.URL.Path[len(viewPath):]
		if !titleValidator.MatchString(title) {
			http.NotFound(rw, req)
			return
		}
		fn(rw, req, title)
	}
}

func viewHandler(rw http.ResponseWriter, req *http.Request, title string) {
	p, err := loadPage(title)
	if err != nil {
		http.Redirect(rw, req, editPath+title, http.StatusFound)
		return
	}
	renderTemplate(rw, "view", p)
}

func editHandler(rw http.ResponseWriter, req *http.Request, title string) {
	p, err := loadPage(title)
	if err != nil {
		p = &Page{Title: title}
	}
	renderTemplate(rw, "edit", p)
}

func saveHandler(rw http.ResponseWriter, req *http.Request, title string) {
	body := req.FormValue("body")
	p := &Page{Title: title, Body: []byte(body)}
	err := p.save()
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	http.Redirect(rw, req, viewPath+title, http.StatusFound)
}

func renderTemplate(rw http.ResponseWriter, tmpl string, p *Page) {
	err := templates.ExecuteTemplate(rw, tmpl+".tpl", p)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
	}
}

func indexHandler(rw http.ResponseWriter, req *http.Request) {
	fileInfos, err := ioutil.ReadDir(pagesDir)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	var pages []string
	for _, p := range fileInfos {
		if p.IsDir() == false {
			pages = append(pages, strings.Replace(p.Name(), ".txt", "", 1))
		}
	}
	err = templates.ExecuteTemplate(rw, "index.tpl", pages)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
	}
}

func main() {
	http.HandleFunc("/", indexHandler)
	http.HandleFunc(indexPath, indexHandler)
	http.HandleFunc(viewPath, makeHandler(viewHandler))
	http.HandleFunc(editPath, makeHandler(editHandler))
	http.HandleFunc(savePath, makeHandler(saveHandler))
	http.ListenAndServe(":8080", nil)
}
