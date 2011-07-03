#!/usr/bin/env bash

cPriv=Company.private.pem   # lives at Company HQ
cPub=Company.public.pem     # live inside the device

dPriv=Device.private.pem    # lives inside the device
dPub=Device.public.pem      # lives at Company HQ

function encANDsend {
    blob=$1
    
    echo "# 1. come up with SKey"
    openssl rand -out skey 240
    
    echo '# 2. encrypt blob with AES using SKey'
    openssl enc -aes-256-cbc -e -salt -in $blob -out blob.ciphered -kfile skey
    
    echo '# 3. encrypt skey with RSA using the device public key'
    openssl rsautl -encrypt -pubin -inkey $dPub -in skey -out skey.ciphered
    
    echo '# 4. sign both ciphered files'
    openssl dgst -sha1 -sign $cPriv -out skey.sig skey.ciphered
    openssl dgst -sha1 -sign $cPriv -out blob.sig blob.ciphered

    echo '# 5. pack up'
    tar -cvf ${1}.tar blob.ciphered blob.sig skey.ciphered skey.sig

    echo '# housekeeping'
    rm skey{,.ciphered,.sig}
    rm blob{.ciphered,.sig}
}

function recvANDdec {
    wdir=$(openssl rand -hex 12)
    tar=$1
    
    echo '# 1. unpacks a tar'
    mkdir $wdir && cd $wdir;
    tar -xvf ../$tar
    
    
    echo '# 2. expects these 4 files inside'
    for f in blob.ciphered blob.sig skey.ciphered skey.sig
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
    openssl dgst -sha1 -verify ../$cPub -signature blob.sig blob.ciphered || (echo 'Error - Blob didnt verify' && exit 2)
    openssl dgst -sha1 -verify ../$cPub -signature skey.sig skey.ciphered || (echo 'Error - SKey didnt verify' && exit 2)
    
    echo '# 4. decrypt skey with cevice private key'
    openssl rsautl -decrypt -inkey ../$dPriv -in skey.ciphered -out skey

    echo '# 5. decrypt blob with skey'
    openssl enc -aes-256-cbc -d -salt -in blob.ciphered -out blob -kfile skey
    
    echo '# exit wdir'
    cd ..
}
