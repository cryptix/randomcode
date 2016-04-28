#!/usr/bin/bash -e

if [[ $# -ne 3 ]]; then
	printf "usage: %s <repo> <commit> <vendor/src>" $0
	exit
fi

# go into vendor
pushd $3

# checkout the full repo
git clone https://$1 $1

# reset this repository's master branch to the commit of interest
pushd $1
git reset --hard $2
popd


popd