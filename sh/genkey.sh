#!/bin/bash

n1=1250
n2=2500
n3=3750
n4=5000
n5=6250
n6=7500
n7=8750
n8=10000

d=$(mktemp -d)
fifo=$d/fifo

function loop {
if [ $# -lt 2 ]; then
echo 'func:loop <from> <to>'
exit
fi

for i in $(seq $1 $2)
do
    j=$(printf "peer%04d", $i)

    mkdir $j
    cd $j
    
    openssl req -new -newkey rsa:4096 -days 365 -nodes -x509 -subj "/C=NV/ST=Nilville/L=Nilville/O=bv/CN=nilville" -keyout server.key  -out server.crt &>/dev/null
    openssl x509 -in server.crt -outform der -out server.der &>/dev/null

    cd ..
done

echo loop $0 $1 done. > $fifo
}

mkfifo $fifo

echo $n1
echo $n2
echo $n3
echo $n4
echo $n5
echo $n6
echo $n7
echo $n8

loop 0   $(expr $n1 - 1) &
loop $n1 $(expr $n2 - 1) &
loop $n2 $(expr $n3 - 1) &
loop $n3 $(expr $n4 - 1) &
loop $n4 $(expr $n5 - 1) &
loop $n5 $(expr $n6 - 1) &
loop $n6 $(expr $n7 - 1) &
loop $n7 $(expr $n8 - 1) &

cat $fifo
cat $fifo
cat $fifo
cat $fifo
cat $fifo
cat $fifo
cat $fifo
cat $fifo
