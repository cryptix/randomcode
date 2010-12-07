#!/bin/sh

host=`awk '/^Host/{print $2}' $HOME/.ssh/config | dmenu -l 4 -p "ssh:"` && st -c ssh -e ssh $host
