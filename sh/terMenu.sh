#!/bin/sh

term=urxvtc

CACHE=${XDG_CACHE_HOME:-"$HOME/.cache"}/dmenu_run
(
  IFS=:
  if test "`ls -dt $PATH "$CACHE" 2> /dev/null | sed 1q`" != "$CACHE"; then
    mkdir -p "`dirname "$CACHE"`" && lsx $PATH | sort -u > "$CACHE"
  fi
)

choice=`awk -F'"' '/"\)/{print $2}' ~/bin/terMenu.sh | dmenu -p 'start:'`
case $choice  in
  "ssh")
    host=`awk '/^Host/{print $2}' ~/.ssh/config | dmenu -p 'ssh:'` && exec $term -e ssh $host
  ;;

  "hist")
  ;;

  "root")
    exec $term -e su -
  ;;

  "window")
    cmd=`dmenu -p 'Window:' < "$CACHE"` && exec $cmd
  ;;

  "term")
    cmd=`dmenu -p 'Term:' < "$CACHE"` && exec $term -e $cmd
  ;;

  *)
    cd $choice && exec $term
  ;;
esac

