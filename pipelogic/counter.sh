#!/bin/sh

FIFOS="clk a3 a2 a1 a0 c4 c3 c2 c1 c0 d3 d2 d1 d0 q3 q2 q1 q0"

rm -f $FIFOS
mkfifo $FIFOS

cat </dev/zero >c0 &
./fa.sh a0 q0 c0 c1 d0 &
./fa.sh a1 q1 c1 c2 d1 &
./fa.sh a2 q2 c2 c3 d2 &
./fa.sh a3 q3 c3 c4 d3 &

./flipflop.sh clk d0 q0 &
./flipflop.sh clk d1 q1 &
./flipflop.sh clk d2 q2 &
./flipflop.sh clk d3 q3 &

./panel -a3 -a2 -a1 -a0 -clk q3 q2 q1 q0

killall mosfet
rm -f $FIFOS tmp.*