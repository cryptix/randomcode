#!/usr/bin/env bash

#location to make backups
loc=/mnt/backup
weekDir=$loc/$(date +%Y-%W)

cPub=~cryptix/backupkey.pub   # lives on the server

function errOut {
	echo "Backup Failed! $1 - $2"
	exit 1

}
# tar $1, encrypt and push to tarsnap with $2
function encANDpack {
	dir=$1
	file=$2-$(date +%Y-%m-%d)

	wdir=$(openssl rand -hex 12)
	
	mkdir -p $loc/tmp/$wdir && cd $loc/tmp/$wdir	       			|| errOut $file "#0 creating wdir"
	
	(tar cfP /dev/stdout $dir | pxz -z - > ./$file.tar.xz) 			|| errOut $file "#1 taring $dir"

	sha256sum ./$file.tar.xz > ./$file.sha256	       			|| errOut $file "#1.5 hashing .tar"
	
	shasum=$(cut -d' ' -f1 ./$file.sha256)	# extract shasum

	grep -q $shasum $loc/hashes/$2 

	# if there is a match, dont store backup
	if [ $? -eq 1 ]; then
		# new backup!
		echo $shasum >> $loc/hashes/$2 # appending new hash
		
		openssl rand -out ./skey.clear 500			    	|| errOut $file "#2 generate SKey"
		
		openssl enc -aes-256-cbc -e -salt \
			-in ./$file.tar.xz \
			-out ./$file.enc \
			-kfile ./skey.clear		       			|| errOut $file "#3 encrypt tar using SKey"
		
		openssl rsautl -encrypt -pubin \
			-inkey $cPub \
			-in ./skey.clear \
			-out ./skey.enc 		       			|| errOut $file "#4 encrypt skey with pubkey"
		

		tar cf $file.packed ./$file.enc ./$file.sha256 ./skey.enc	|| errOut $file "#5 packing up"

		##  backups will be pushed at the weekend

		#echo '# 5. pushing via tarsnap'
		#tarsnap -c -f $file ./$file.enc ./skey.enc || exit 1
		
		#echo '# housekeeping'
		mkdir -p $weekDir && mv $file.packed $weekDir/ 
	fi

	cd .. && rm -rf $wdir	|| errOut $file "#6 clean up"
}


## legacy encr with skey
## limited by rsa keysize..
#	openssl rsautl -encrypt -pubin \
#		-inkey $cPub \
#		-in ./skey.clear \
#		-out ./skey.enc 

#   openssl rsautl -decrypt -inkey ../$dPriv -in skey -out skey.clear

#function recvANDdec {
#    zipf=$1
#    fname=$(echo $zipf | sed 's/.zip//')
#
#    wdir=$(openssl rand -hex 12)
#    
#    echo '# 1. unpacks a tar'
#    mkdir $wdir && cd $wdir;
#    unzip ../$zipf
#    
#    echo '# 2. expects these 4 files inside'
#    for f in blob blob.sig skey skey.sig
#    do
#        if test -f $f;
#        then
#            echo "Found $f"
#        else
#            echo "Error - $f missing"
#            break
#            #exit 1
#        fi
#    done
#    
#    echo '# 3. check signatures against company.public.pem'
#    openssl dgst -sha1 -verify ../$cPub -signature blob.sig blob || (echo 'Error - Blob didnt verify' && exit 2)
#    openssl dgst -sha1 -verify ../$cPub -signature skey.sig skey || (echo 'Error - SKey didnt verify' && exit 2)
#    
#    echo '# 4. decrypt skey with cevice private key'
#    openssl rsautl -decrypt -inkey ../$dPriv -in skey -out skey.clear
#
#    echo '# 5. decrypt blob with skey'
#    openssl enc -aes-256-cbc -d -salt -in blob -out $fname -kfile skey.clear
#    
#    echo '# housekeeping'
#    mv $fname .. && cd ..
#    #rm -rf $wdir
#}
