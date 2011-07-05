$!/usr/bin/bash

## Generate Keys

echo '\n\nGenerating new RSA key'

# Generate a RSA key named 'RSAKey.private.pem'
openssl genrsa -out RSAKey.private.pem 2048

# Encrypt that key so only you can use it
#openssl rsa -in RSAKey.private.pem -des3 -out RSAKey.secured.pem

# Extract the public part
openssl rsa -in RSAKey.private.pem -pubout -out RSAKey.public.pem


## En/Decryption - RSA LowLevel
# since rsa is a block ciphere 'small.txt' needs to be smaller than keyfile/8
echo '\n\nGenerating small random data for ENC/DEC'
openssl rand -out small.bin 240

# Encrypt
openssl rsautl -encrypt -pubin -inkey RSAKey.public.pem -in small.bin -out small.ciphered

# Decrypt
openssl rsautl -decrypt -inkey RSAKey.private.pem -in small.ciphered -out small2.bin

# test
echo '\n\nsmall.bin == small2.bin?'
openssl dgst -sha1 small.bin small2.bin


## Signing/Verifying
echo '\n\nGenerating large random data for Sign/Verify'
openssl rand -out test1.bin 4096

# Sign the content of 'test.bin' with our Key
openssl dgst -sha1 -sign RSAKey.private.pem -out test.bin.signature test1.bin

# Verify that signature (with the public key)
openssl dgst -sha1 -verify RSAKey.public.pem -signature test.bin.signature test1.bin


## En/Decryption - AES with keyfile
echo '\n\nGenerating random session key for AES ENC/DEC'
openssl rand -out skey.bin 1024

# encrypt
openssl enc -aes-256-cbc -e -salt -in test1.bin -out test1.ciphered -kfile skey.bin

# decrypt
openssl enc -aes-256-cbc -d -salt -in test1.ciphered -out test2.bin -kfile skey.bin

# test
echo '\n\test1.bin == test2.bin?'
openssl dgst -sha1 test1.bin test2.bin