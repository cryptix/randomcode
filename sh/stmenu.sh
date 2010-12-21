#!/bin/sh

case `awk -F'"' '/"\)/{print $2}' ~/bin/stmenu.sh | dmenu -p "st:"` in
	"cd")
	;;

	"ssh")
		host=`awk '/^Host/{print $2}' ~/.ssh/config | dmenu -p "ssh:"` && st -c ssh -e ssh $host
	;;

	"hist")
	;;

	"g")
	st
	;;
esac

