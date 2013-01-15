#!/bin/sh

# Usage: flipflop.sh Clk D Q

CLK=$1
D=$2
Q=$3

D1H=tmp.ff.d1h.$$
D1L=tmp.ff.d1l.$$
D2H=tmp.ff.d2h.$$
D2L=tmp.ff.d2l.$$
NQ=tmp.ff.nq.$$

VSS=/dev/zero
VDD=/dev/null

FIFOS="$D1H $D1L $D2H $D2L $NQ"
rm -f $FIFOS
mkfifo $FIFOS

./mosfet <$VSS $D >$D1L &
./mosfet <$D1L -$CLK >$D1H &
./mosfet <$D1H -$D >$VDD &

./mosfet <$VSS $D1L >$D2L &
./mosfet <$D2L $CLK >$D2H &
./mosfet <$D2H -$D1H >$VDD &

./mosfet <$VSS $D2L >$NQ &
./mosfet <$NQ -$D2H >$VDD &

./mosfet <$VSS $NQ >$Q &
exec ./mosfet <$Q -$NQ >$VDD