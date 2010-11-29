#!/bin/sh
host=`awk '/^Host/{print $2}' ~/.ssh/config | grep -v '*' | dmenu` && st -e "ssh $host"
