package main

import (
	"fmt"

	"github.com/bitly/go-simplejson"
	"github.com/kr/pretty"
	"github.com/mitchellh/mapstructure"
)

type TestA struct {
	A, B string
	Nice int
}

const niceResp = `[200,[{"A":"Hi","B":"Great", "Nice":123}, {"A":"Now", "B":"Boar", "Nice":321}]]`

func main() {

	var buf = []byte(niceResp)
	json, err := simplejson.NewJson(buf)
	check(err)

	fmt.Printf("Raw:%# v\n", pretty.Formatter(json))

	code, err := json.GetIndex(0).Int()
	check(err)

	fmt.Println("Code:", code)

	arr, err := json.GetIndex(1).Array()
	check(err)

	var result []TestA
	config := &mapstructure.DecoderConfig{
		WeaklyTypedInput: true,
		Result:           &result,
	}
	dec, err := mapstructure.NewDecoder(config)
	check(err)

	check(dec.Decode(arr))

	pretty.Println(result)

}

func check(err error) {
	if err != nil {
		panic(err)
	}
}
