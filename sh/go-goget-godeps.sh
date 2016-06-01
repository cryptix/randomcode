#!/usr/bin/bash -e

if [[ $# -ne 3 ]]; then
	printf "usage: %s <repo> <commit> <vendor/src>" $0
	exit
fi

# GOPATH is $proj/vendor
export GOPATH=$3

# checkout the full repo
go get -v $1

# reset this repository's master branch to the commit of interest
pushd $GOPATH/src/$1
git reset --hard $2
popd
