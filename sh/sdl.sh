#!/usr/bin/env sh

destdir="/tmp/"
cfile="~/.surf/cookies.txt"

cmd="wget"

url=$1
host=`echo $url | cut -d'/' -f3`

case "$host" in
	"feedthe.net")
		cmd="curl"
		fname=`echo $url | awk -F'/' '{split($NF,a,"?"); print a[1]}'`
		args="-o $fname -b $cfile"
	;;

	"e-learning.tu-harburg.de")
		cmd="curl"
		fname=`echo $url | awk -F'=' '{print $NF}'`
		args="-o $fname -b $cfile"
	;;
	
	*)
		args=""
	;;
esac

xterm -e "cd $destdir && $cmd $args '$url' || read"
