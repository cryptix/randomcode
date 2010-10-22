#!/usr/bin/env sh

destdir="/tmp/"
cfile="~/.surf/cookies.txt"
cmd='wget'
args="--load-cookies $cfile"

url=$1
host=`echo $url | cut -d'/' -f3`


case "$host" in
	"feedthe.net")
	cmd="curl"
	fname=`echo $url | cut -d'/' -f6 | cut -d'?' -f1`
	args="-o $fname -b $cfile"
	;;
	
	*)
	;;
esac


xterm -e "cd $destdir && $cmd $args '$url' && read"
