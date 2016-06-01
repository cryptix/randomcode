package main

import (
	"fmt"

	"github.com/gopherjs/gopherjs/js"
)

func main() {
	js.Global.Set("BarChartTut", map[string]interface{}{
		"part1": part1,
		"part2": part2,
		"part3": part3,
		"part4": part4,
	})
}

func makeText(obj js.Object) string {
	return fmt.Sprintf("[%d]", obj.Int())
}
