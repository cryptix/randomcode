#!/usr/bin/env bash

cPriv=Company.private.pem   # lives at Company HQ
cPub=Company.public.pem     # live inside the device

dPriv=Device.private.pem    # lives inside the device
dPub=Device.public.pem      # lives at Company HQ

function encANDsend {
    blob=$1
    wdir=$(openssl rand -hex 12)
    
    mkdir $wdir && cd $wdir

    echo "# 1. come up with SKey"
    openssl rand -out skey.clear 240
    
    echo '# 2. encrypt blob with AES using SKey'
    openssl enc -aes-256-cbc -e -salt -in ../$blob -out blob -kfile skey.clear
    
    echo '# 3. encrypt skey with RSA using the device public key'
    openssl rsautl -encrypt -pubin -inkey ../$dPub -in skey.clear -out skey
    
    echo '# 4. sign both ciphered files'
    openssl dgst -sha1 -sign ../$cPriv -out skey.sig skey
    openssl dgst -sha1 -sign ../$cPriv -out blob.sig blob

    echo '# 5. pack up'
    zip ${1}.zip blob blob.sig skey skey.sig

    echo '# housekeeping'
    mv ${1}.zip .. && cd ..
    #rm -rf $wdir
}

function recvANDdec {
    zipf=$1
    fname=$(echo $zipf | sed 's/.zip//')

    wdir=$(openssl rand -hex 12)
    
    echo '# 1. unpacks a tar'
    mkdir $wdir && cd $wdir;
    unzip ../$zipf
    
    echo '# 2. expects these 4 files inside'
    for f in blob blob.sig skey skey.sig
    do
        if test -f $f;
        then
            echo "Found $f"
        else
            echo "Error - $f missing"
            break
            #exit 1
        fi
    done
    
    echo '# 3. check signatures against company.public.pem'
    openssl dgst -sha1 -verify ../$cPub -signature blob.sig blob || (echo 'Error - Blob didnt verify' && exit 2)
    openssl dgst -sha1 -verify ../$cPub -signature skey.sig skey || (echo 'Error - SKey didnt verify' && exit 2)
    
    echo '# 4. decrypt skey with cevice private key'
    openssl rsautl -decrypt -inkey ../$dPriv -in skey -out skey.clear

    echo '# 5. decrypt blob with skey'
    openssl enc -aes-256-cbc -d -salt -in blob -out $fname -kfile skey.clear
    
    echo '# housekeeping'
    mv $fname .. && cd ..
    #rm -rf $wdir
}
