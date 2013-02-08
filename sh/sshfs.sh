#!/usr/bin/env sh
function mntsshfs () {
  sshfs $1:$2 ~/$3 -o volname=$3,reconnect
}

#mntsshfs oObsi . oObsi
#mntsshfs oObsi /mnt/movies Movies
#mntsshfs oObsi /mnt/tmp tmp
mntsshfs limaVPN . lima
