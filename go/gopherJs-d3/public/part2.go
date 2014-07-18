package main

import (
	"fmt"
	"github.com/gopherjs/gopherjs/js"
	"github.com/iansmith/d3"
)

func part2(id d3.Selector, data js.Object) {

	width, barHeight := int64(500), 20

	x := d3.ScaleLinear()
	x.Domain([]int64{0, d3.Max(data, nil)}).Range([]int64{0, width})

	chart := d3.Select(id)
	chart.Attr("width", width)
	chart.Attr("height", int64(data.Length()*barHeight))

	barUpdate := chart.SelectAll("g").Data(data, d3.IdentityKeyFunction)

	translateGroup := func(_ js.Object, i int64) string {
		return fmt.Sprintf("translate(0,%d)", int(i)*barHeight)
	}
	bars := barUpdate.Enter().Append("g").AttrFunc2S("transform", translateGroup)
	barUpdate.Exit().Remove()

	bars.
		Append("rect").
		AttrFunc("width", x.Func(nil)).
		Attr("height", int64(barHeight-1))

	getXposForText := func(d js.Object) int64 {
		return x.Linear(d, nil) - 3
	}
	bars.
		Append("text").
		AttrFunc("x", getXposForText).
		Attr("y", int64(barHeight/2)).
		AttrS("dy", ".35em").
		Text(makeText)
}
