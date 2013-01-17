#!/bin/sh

# Usage: fa.sh A B Cin Cout Sum

A=$1
B=$2
CIN=$3
COUT=$4
SUM=$5

T1=tmp.fa.t1.$$
T2=tmp.fa.t2.$$
T3=tmp.fa.t3.$$
T4=tmp.fa.t4.$$
NCOUT=tmp.fa.ncout.$$
NSUM=tmp.fa.nsum.$$

VSS=/dev/zero
VDD=/dev/null

rm -f $T1 $T2 $T3 $T4 $NCOUT $NSUM
mkfifo $T1 $T2 $T3 $T4 $NCOUT $NSUM

# Mirror Adder

./mosfet <$T1 -$A >$VDD &
./mosfet <$T1 -$B >$VDD &
./mosfet <$NCOUT -$CIN >$T1 &
./mosfet <$NCOUT -$A | ./mosfet -$B >$VDD &

./mosfet <$VSS $A >$T2 &
./mosfet <$VSS $B >$T2 &
./mosfet <$T2 $CIN >$NCOUT &
./mosfet <$VSS $B | ./mosfet $A >$NCOUT &

./mosfet <$T3 -$A >$VDD &
./mosfet <$T3 -$B >$VDD &
./mosfet <$T3 -$CIN >$VDD &
./mosfet <$NSUM -$NCOUT >$T3 &
./mosfet <$NSUM -$CIN | ./mosfet -$B | ./mosfet -$A >$VDD &

./mosfet <$VSS $A >$T4 &
./mosfet <$VSS $B >$T4 &
./mosfet <$VSS $CIN >$T4 &
./mosfet <$T4 $NCOUT >$NSUM &
./mosfet <$VSS $A | ./mosfet $B | ./mosfet $CIN >$NSUM &

# Invert outputs

./mosfet <$VSS $NCOUT >$COUT &
./mosfet <$COUT -$NCOUT >$VDD &

./mosfet <$VSS $NSUM >$SUM &
exec ./mosfet <$SUM -$NSUM >$VDD