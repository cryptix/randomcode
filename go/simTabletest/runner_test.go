package main

import (
	"testing"
)

var truthtable = []struct {
	inA, inB int
	out      [3]int
}{
	{0, 0, [3]int{0, 0, 0}},
	{0, 1, [3]int{1, 0, 1}},
	{1, 0, [3]int{1, 0, 1}},
	{1, 1, [3]int{1, 1, 0}},
}

func TestTruthTable(t *testing.T) {
	r := new(SimpleSim)

	for i, tt := range truthtable {
		// r.reset()
		s := r.run(tt.inA, tt.inB)
		if s.Out[0] != tt.out[0] || s.Out[1] != tt.out[1] || s.Out[2] != tt.out[2] {
			t.Errorf("#%d failed - got: %v want:%v", i, s.Out, tt.out)
		}

	}
}
