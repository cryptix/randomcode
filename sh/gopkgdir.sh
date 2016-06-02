#!/usr/bin/env bash

#export GOPATH=$HOME/DST/TIS-Go:$HOME/DST/TIS-Go/vendor
export GOPATH=$HOME/go

pkg=$(go list all | dmenu -p 'go pkg:' -l 10 -i)
gopathEnts=(${GOPATH//:/ })
for e in "${!gopathEnts[@]}"
do
 loc=${gopathEnts[$e]}/src/$pkg
 test -d $loc && echo $loc
done

