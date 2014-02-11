package main

// #include "sim.h"
import "C"

import (
	"fmt"
	"time"
)

const (
	low  = iota // 0
	high        // 1
	idxA
	idxB
	idxClk
	idxRst
	idxT1
	idxT2
	idxT3
)

type SimpleSim struct {
	Data     []State
	Duration time.Duration
}

// reset simulation
func (sim SimpleSim) reset() {
	// enable rst
	C.pshdl_sim_setInput(idxRst, high)

	C.pshdl_sim_setInput(idxClk, low)
	C.pshdl_sim_run()
	C.pshdl_sim_setInput(idxClk, high)
	C.pshdl_sim_run()

	// disable rst
	C.pshdl_sim_setInput(idxRst, high)

	C.pshdl_sim_setInput(idxClk, low)
	C.pshdl_sim_run()
	C.pshdl_sim_setInput(idxClk, high)
	C.pshdl_sim_run()
}

// read state from simulation code
func (sim SimpleSim) run(a, b int) State {
	var s State

	// update input
	C.pshdl_sim_setInput(idxA, C.long(a))
	C.pshdl_sim_setInput(idxB, C.long(b))

	// run one cycle
	C.pshdl_sim_setInput(idxClk, low)
	C.pshdl_sim_run()
	C.pshdl_sim_setInput(idxClk, high)
	C.pshdl_sim_run()

	// read output
	s.update()

	return s
}

type State struct {
	A   int
	B   int
	Out [3]int
}

// returns formated state string
func (s State) String() string {
	var str string

	str = fmt.Sprintf("A[%4d] B[%4d]\n", s.A, s.B)
	str += fmt.Sprintf("Out: %v\n", s.Out)

	return str
}

func (s *State) update() {
	s.A = int(C.pshdl_sim_getOutput(idxA))
	s.B = int(C.pshdl_sim_getOutput(idxB))

	// cgo doesnt support variadic arguments :<
	// https://code.google.com/p/go/issues/detail?id=975
	// fmt.Println(C.pshdl_sim_getOutput(idxTap))
	s.Out[0] = int(C.pshdl_sim_getOutput(idxT1))
	s.Out[1] = int(C.pshdl_sim_getOutput(idxT2))
	s.Out[2] = int(C.pshdl_sim_getOutput(idxT3))
}
