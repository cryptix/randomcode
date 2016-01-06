#!/usr/local/bin/bash

#export GOPATH=$HOME/Work/DST-Code/TIS-Go:$HOME/Work/DST-Code/TIS-Go/vendor
#export GOPATH=$HOME/go

pkg=$(go list all | dmenu -p 'go pkg:' -l 10 -i)
gopathEnts=(${GOPATH//:/ })
for e in "${!gopathEnts[@]}"
do
 loc=${gopathEnts[$e]}/src/$pkg
 test -d $loc && echo $loc
done

