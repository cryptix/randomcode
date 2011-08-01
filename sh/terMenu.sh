#!/bin/sh

term=urxvtc

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
    dmenu_run -p 'win'
  ;;

  "term")
    cmd=`dmenu_path | dmenu -p 'cmd'` && exec $term -e '$cmd'
  ;;

  *)
    cd $choice && exec $term
  ;;
esac

