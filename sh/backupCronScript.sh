#!/usr/bin/env bash

source ~cryptix/code/sh/cryptoHybridBackup.sh

echo "Starting System Backup at $(date)" 

#imap directories
encANDpack /srv/vmailer webmail

#main http site
encANDpack /srv/http	website

#sql dumps
sqlDir=/mnt/backup/sql-$(openssl rand -hex 5)
mkdir $sqlDir && cd $sqlDir

pg_dump -F t -U mailRole       mailUsers   > ./mailUsers.dump.tar
pg_dump -F t -U nuclos         nuclosdb    > ./nuclos1.dump.tar
pg_dump -F t -U nuclosAPDirekt nuclosdbAPD > ./nuclosApd.dump.tar

encANDpack $sqlDir 		sqlBackups
cd .. && rm -rf $sqlDir


#configurations
encANDpack /etc/postfix ConfPostfix
encANDpack /etc/dovecot ConfDovecot
encANDpack /etc/nginx   ConfNginx
encANDpack /etc/ssh		ConfSSH
encANDpack /etc/openvpn ConfOpenVPN
encANDpack /etc/clamav  ConfClamAV

echo "Done with System Backup at $(date)"
ls -lh *.packed
