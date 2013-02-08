package main

import (
	"html/template"
	"io/ioutil"
	"net/http"
	"regexp"
)

// Globals
var templates = template.Must(template.ParseFiles("edit.tpl", "view.tpl"))
var titleValidator = regexp.MustCompile("^[a-zA-Z0-9]+$")

// Page class
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

// Handlers
const (
	viewPath = "/view/"
	editPath = "/edit/"
	savePath = "/save/"
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
	renderTemplae(rw, "view", p)
}

func editHandler(rw http.ResponseWriter, req *http.Request, title string) {
	p, err := loadPage(title)
	if err != nil {
		p = &Page{Title: title}
	}
	renderTemplae(rw, "edit", p)
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

func renderTemplae(rw http.ResponseWriter, tmpl string, p *Page) {
	err := templates.ExecuteTemplate(rw, tmpl+".tpl", p)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
	}
}

func main() {
	http.HandleFunc(viewPath, makeHandler(viewHandler))
	http.HandleFunc(editPath, makeHandler(editHandler))
	http.HandleFunc(savePath, makeHandler(saveHandler))
	http.ListenAndServe(":8080", nil)
}
