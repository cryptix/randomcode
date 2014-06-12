package main

import (
	"fmt"
	"github.com/gopherjs/gopherjs/js"
	"github.com/iansmith/d3"
	"honnef.co/go/js/console"
	"strconv"
)

type margin struct {
	top, right, bottom, left int64
}

func part4(id d3.Selector) {
	// size setup
	m := margin{20, 30, 30, 40}
	var width, height int64 = 960 - m.left - m.right, 500 - m.top - m.bottom

	// scaler for the letters
	x := d3.ScaleOrdinal()
	x.RangeRoundBands([]int64{0, width}, 0.1)

	// scaler for the freq
	y := d3.ScaleLinear()
	y.Range([]int64{height, 0})

	// axis
	xAxis := d3.NewAxis()
	xAxis.ScaleO(x).Orient(d3.BOTTOM)
	yAxis := d3.NewAxis()
	yAxis.Scale(y).Orient(d3.LEFT).Ticks(20, "%")

	// create a chart with size and group for the margins
	chart := d3.Select(id).
		Attr("width", width+m.left+m.right).
		Attr("height", height+m.top+m.bottom).
		Append("g").
		AttrS("transform", fmt.Sprintf("translate(%d,%d)", m.left, m.top))

	// filter function
	// mainly to parse string to float
	freqFilter := func(obj js.Object) js.Object {
		result := js.Global.Get("Object").New()
		result.Set("letter", obj.Get("letter").Str())
		s := obj.Get("frequency").Str()
		val, err := strconv.ParseFloat(s, 64)
		if err != nil {
			console.Error("unable to parse ", s, " in the dataset: IGNORED")
			return nil
		}
		result.Set("frequency", val)
		return result
	}

	// helpers
	extractFreq := func(obj js.Object) float64 { return obj.Get("frequency").Float() }
	extractLetter := func(obj js.Object) string { return obj.Get("letter").Str() }

	//horrific way to do map(func)
	extractAllLetters := func(obj js.Object) js.Object {
		result := js.Global.Get("Array").New()
		for i := 0; i < obj.Length(); i++ {
			result.SetIndex(i, extractLetter(obj.Index(i)))
		}
		return result
	}

	// request data from server
	d3.TSV("freq.tsv", freqFilter, func(err js.Object, data js.Object) {
		if !err.IsNull() {
			console.Error("Error during data request:", err.Str())
			return
		}

		// adjust scalers to data
		x.Domain(extractAllLetters(data))
		y.DomainF([]float64{0, d3.MaxF(data, extractFreq)})

		// attach x axis to chart
		chart.Append("g").
			AttrS("class", "x axis").
			AttrS("transform", fmt.Sprintf("translate(0,%d)", height)).
			Call(xAxis)

		// attach y axis to chart
		chart.Append("g").
			AttrS("class", "y axis").
			Call(yAxis).
			Append("text"). // and a nice label
			AttrS("transform", "rotate(-90)").
			AttrF("y", 6.0).
			AttrS("dy", ".71em").
			StyleS("text-anchor", "end").
			TextS("Frquency")

		// add data bars
		heightMinusYofFreq := func(obj js.Object) float64 {
			return float64(height) - y.LinearF(obj, extractFreq)
		}
		chart.
			SelectAll(".bar").
			Data(data, nil). // by index should be ok
			Enter().
			Append("rect").
			AttrS("class", "bar").
			AttrFunc("x", x.Func(extractLetter)).
			AttrFuncF("y", y.FuncF(extractFreq)).
			AttrFuncF("height", heightMinusYofFreq).
			Attr("width", x.RangeBand())

	})

}
