package main

import (
	"net/http"
	"os"

	"github.com/shurcooL/httpfs/html/vfstemplate"
)

func main() {
	tpl, err := vfstemplate.ParseFiles(http.Dir("."), nil, "base.tmpl", "ex1.tmpl")
	check(err)
	err = tpl.Execute(os.Stdout, map[string]interface{}{
		"hi": 42,
	})
	check(err)
}

func check(err error) {
	if err != nil {
		panic(err)
	}
}
