package main

import (
	"fmt"
	"github.com/BurntSushi/xgb"
	"github.com/BurntSushi/xgb/xproto"
)

func main() {
	X, err := xgb.NewConn()
	if err != nil {
		fmt.Println(err)
		return
	}

	wid, _ := xproto.NewWindowId(X)
	screen := xproto.Setup(X).DefaultScreen(X)
	xproto.CreateWindow(X, screen.RootDepth, wid, screen.Root,
		0, 0, 500, 500, 0,
		xproto.WindowClassInputOutput, screen.RootVisual,
		xproto.CwBackPixel|xproto.CwEventMask,
		[]uint32{ // values must be in the order defined by the protocol
			0xffffffff,
			xproto.EventMaskStructureNotify |
				xproto.EventMaskKeyPress |
				xproto.EventMaskKeyRelease})

	xproto.MapWindow(X, wid)
	for {
		ev, xerr := X.WaitForEvent()
		if ev == nil && xerr == nil {
			fmt.Println("Both event and error are nil. Exiting...")
			return
		}

		if ev != nil {
			fmt.Printf("Event: %s\n", ev)
		}
		if xerr != nil {
			fmt.Printf("Error: %s\n", xerr)
		}
	}
}
