#!/bin/sh

choice=`awk -F'"' '/"\)/{print $2}' ~/bin/stmenu.sh | dmenu -p "st:"`
case $choice  in
	"ssh")
		host=`awk '/^Host/{print $2}' ~/.ssh/config | dmenu -p "ssh:"` && exec st -c ssh -e ssh $host
	;;

	"hist")
	;;

	"root")
	exec st -c root -e su -
	;;

	"window")
	dmenu_run
	;;

	"term")
	cmd=`dmenu_path | dmenu -p "cmd"` && exec st -e "$cmd"
	;;

	*)
	cd $choice && exec st
	;;
esac

