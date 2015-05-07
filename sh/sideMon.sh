#!/usr/bin/env bash
url=https://ticketing.fusion-festival.de/de/tix/
hash=QmYMVfxbjxtDyjNGgBqehWy6At3mbdv3feVomF1jh2cVZ5
run=1
while [ $run -eq 1 ]; do
 	test $hash != $(curl  $url | multihash) && xmessage CHANGED && xdg-open $url;
 	sleep 10;
done