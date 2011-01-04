#!/bin/sh

choice=`awk -F'"' '/"\)/{print $2}' ~/bin/stmenu.sh | dmenu -p "st:"`
case $choice  in
	"ssh")
		host=`awk '/^Host/{print $2}' ~/.ssh/config | dmenu -p "ssh:"` && st -c ssh -e ssh $host
	;;

	"hist")
	;;

	"root")
	st -c root -e su -
	;;

	"window")
	dmenu_run
	;;

	"term")
	cmd=`dmenu_path | dmenu -p "cmd"` && st -e "$cmd"
	;;

	*)
	cd $choice && st
	;;
esac

