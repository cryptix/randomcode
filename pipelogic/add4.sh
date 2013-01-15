#!/bin/sh

FIFOS="a3 a2 a1 a0 b3 b2 b1 b0 c3 c2 c1 c0 s4 s3 s2 s1 s0"

rm -f $FIFOS
mkfifo $FIFOS

cat </dev/zero >c0 &
./fa.sh a0 b0 c0 c1 s0 &
./fa.sh a1 b1 c1 c2 s1 &
./fa.sh a2 b2 c2 c3 s2 &
./fa.sh a3 b3 c3 s4 s3 &

./panel -a3 -a2 -a1 -a0 -b3 -b2 -b1 -b0 s4 s3 s2 s1 s0

killall mosfet
rm -f $FIFOS tmp.*