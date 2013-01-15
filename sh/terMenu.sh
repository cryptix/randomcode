#!/bin/sh

term=urxvtc

cachedir=${XDG_CACHE_HOME:-"$HOME/.cache"}
if [ -d "$cachedir" ]; then
	cache=$cachedir/dmenu_run
else
	cache=$HOME/.dmenu_cache # if no xdg dir, fall back to dotfile in ~
fi
(
	IFS=:
	if stest -dqr -n "$cache" $PATH; then
		stest -flx $PATH | sort -u > "$cache"
	fi
) 

choice=`awk -F'"' '/"\)/{print $2}' ~/bin/terMenu.sh | dmenu -p 'start:'`
case $choice in
  "open")
    dir=`lsof  -d cwd -Fn | awk '/^n/{sub("n","" ); print }' | sort -u | dmenu -p "open:"`
    cd "$dir" && exec $term
  ;;

  "ssh")
    host=`awk '/^Host/{print $2}' ~/.ssh/config | dmenu -p 'ssh:'` && exec $term -e ssh $host
  ;;


  "root")
    exec $term -e su -
  ;;

  "window")
    cmd=`dmenu -p 'Window:' < "$cache"` && exec $cmd
  ;;

  "term")
    cmd=`dmenu -p 'Term:' < "$cache"` && exec $term -e $cmd
  ;;

  *)
    cd $choice && exec $term
  ;;
esac

