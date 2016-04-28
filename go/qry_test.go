package main

import (
	"fmt"
	"strconv"
	"strings"
)

func ExampleBuild() {
	ids := []int64{1, 3, 19}
	idStrs := make([]string, len(ids))
	for i, v := range ids {
		idStrs[i] = strconv.FormatInt(v, 10)
	}
	qry := "(" + strings.Join(idStrs, ",") + ")"
	fmt.Println(qry)
	//Output: (1,3,19)
}
