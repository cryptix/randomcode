#!/bin/sh

# Usage: nand.sh A B Out

A=$1
B=$2
OUT=$3

VDD=/dev/null
VSS=/dev/zero

./mosfet <$OUT -$A >$VDD &
./mosfet <$OUT -$B >$VDD &

./mosfet <$VSS $B | ./mosfet $A >$OUT