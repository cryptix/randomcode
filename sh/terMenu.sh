#!/usr/bin/env sh

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

choice=`awk -F'"' '/"\)/{print $2}' /usr/local/bin/terMenu.sh | dmenu -p 'terMenu:'`
case $choice  in
  "gocd")
    cd $(gopkgdir.sh) && exec $term
  ;;

  "open")
    cd `lsof -d cwd -Fn | grep '^n' | cut -dn -f2- | cut -d ' ' -f 1 | sort -u | dmenu -p 'open:'` && exec $term
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
