package main

import (
	"github.com/gopherjs/gopherjs/js"
	"github.com/iansmith/d3"
	"honnef.co/go/js/console"
	"strconv"
)

func part3(id d3.Selector, data js.Object) {
	// makes obj like {name: "xxx", value: 32}
	_ = func(obj js.Object) js.Object {
		result := js.Global.Get("Object").New()
		result.Set("name", obj.Get("name").Str())
		s := obj.Get("value").Str()
		val, err := strconv.ParseInt(s, 10, 64)
		if err != nil {
			console.Error("unable to parse ", s, " in the dataset: IGNORED")
			return nil
		}
		result.Set("value", val)
		return result
	}

	// just returns the value
	numFilter := func(obj js.Object) js.Object {
		s := obj.Get("value").Str()
		val, err := strconv.ParseInt(s, 10, 64)
		if err != nil {
			console.Error("unable to parse ", s, " in the dataset: IGNORED")
			return nil
		}

		valObj := js.Global.Get("Number").New(val)
		return valObj
	}

	d3.TSV("data.tsv", numFilter, func(err js.Object, data js.Object) {
		if !err.IsNull() {
			console.Error("Error during data request:", err.Str())
			return
		}

		part2(id, data)
	})
}
