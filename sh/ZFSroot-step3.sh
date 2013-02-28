#!/bin/sh

zfs create zdata/home

zfs create zroot/var

zfs create -o exec=off -o setuid=off zroot/var/db
zfs create -o exec=off -o setuid=off zroot/var/empty
zfs create -o exec=off -o setuid=off zroot/var/run

zfs create -o compression=on -o exec=on -o setuid=off zroot/tmp

zfs create -o compression=lzjb -o setuid=off zdata/ports

zfs create -o compression=off -o exec=off -o setuid=off zdata/ports/distfiles
zfs create -o compression=off -o exec=off -o setuid=off zdata/ports/packages

zfs create -o compression=lzjb -o exec=off -o setuid=off zdata/src
zfs create -o compression=lzjb -o exec=off -o setuid=off zroot/var/crash

zfs create -o compression=gzip -o exec=off -o setuid=off zroot/var/mail
zfs create -o compression=lzjb -o exec=off -o setuid=off zroot/var/log
zfs create -o compression=lzjb -o exec=on -o setuid=off  zroot/var/db/pkg
zfs create -o compression=lzjb -o exec=on -o setuid=off  zroot/var/tmp




zfs create -V 4G zroot/swap
zfs set org.freebsd:swap=on zroot/swap
zfs set checksum=off zroot/swap

zfs set mountpoint=/usr zdata
