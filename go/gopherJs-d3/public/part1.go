package main

import (
	"fmt"
	"github.com/gopherjs/gopherjs/js"
	"github.com/iansmith/d3"
)

func part1(id d3.Selector, data js.Object) {

	x := d3.ScaleLinear()
	x.Domain([]int64{0, d3.Max(data, nil)}).Range([]int64{0, 500})

	chart := d3.Select(id)

	getWidthFromData := func(obj js.Object) string {
		w := fmt.Sprintf("%dpx", x.Linear(obj, nil))
		// console.Log("Width:", w)
		return w
	}

	d3data := chart.SelectAll("div").Data(data, d3.IdentityKeyFunction)

	d3data.Enter().Append("div").Style("width", getWidthFromData).Text(makeText)
	d3data.Exit().Remove()
}
