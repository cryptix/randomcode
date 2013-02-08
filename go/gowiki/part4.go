package main

import (
	"html/template"
	"io/ioutil"
	"net/http"
)

const (
	viewPath = "/view/"
	editPath = "/edit/"
	savePath = "/save/"
)

type Page struct {
	Title string
	Body  []byte
}

var templates = template.Must(template.ParseFiles("edit.tpl", "view.tpl"))

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
	title := req.URL.Path[len(viewPath):]
	p, err := loadPage(title)
	if err != nil {
		http.Redirect(rw, req, editPath+title, http.StatusFound)
		return
	}
	renderTemplae(rw, "view", p)
}

func editHandler(rw http.ResponseWriter, req *http.Request) {
	title := req.URL.Path[len(editPath):]
	p, err := loadPage(title)
	if err != nil {
		p = &Page{Title: title}
	}
	renderTemplae(rw, "edit", p)
}

func saveHandler(rw http.ResponseWriter, req *http.Request) {
	title := req.URL.Path[len(savePath):]
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
	http.HandleFunc(viewPath, viewHandler)
	http.HandleFunc(editPath, editHandler)
	http.HandleFunc(savePath, saveHandler)
	http.ListenAndServe(":8080", nil)
}
