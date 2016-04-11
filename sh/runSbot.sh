#!/usr/bin/bash

errorRoot="%DQnc50C8nZzwDxdJYSVs+yHs/NKioXywStTcE+WPqGs=.sha256"

cnt=1

die() {
  printf >&/dev/stderr -- "Error: %s\n" "$1"
  exit 1
}

sbot=sbot
test -f $sbot || sbot=~/node_modules/.bin/sbot
test -f $sbot || die "please install sbot into \$PATH"

ipfs=ipfs
test -f $ipfs || ipfs=~/go/bin/ipfs
test -f $ipfs || die "please install ipfs into \$PATH"


postError() {
  local fname=$1;

  test -f $fname || die "no such file: $fname"
  
  pollServer;
  $sbot publish --type post --root $errorRoot --branch $errorRoot  --text "[restarted] [count:$cnt] [last log](https://ipfs.io/ipfs/$(findTraceStart $fname))"
}


findTraceStart() {
  local fname=$1;
  local i=0;
  local n=$(wc -l < $fname);

  test $n -gt 0 || die "log file has zero size";


  local errFile="";
  local lastLine=$(( $n - $i ));
  while [[ ! -f $errFile ]];
  do
    errFile=$(sed -n "${lastLine}p" $fname | cut -d':' -f1)
    i=$(( $i+1 ))
    lastLine=$(( $n - $i ));
    test $lastLine -gt 0 || die "reached negative line count.";
    test $i -lt 100 || die "looked far enough";
  done

  local logHash=$(tail -n $i $fname | $ipfs add -q -s rabin)
  echo $logHash >> found
}



pollServer() {
  local dst=/dev/tcp/localhost/8008
  echo "hi" > $dst
  local exitCode=$?
  while [[ $exitCode -eq 1 ]];
  do
    echo "hi" > $dst
    exitCode=$?
    sleep 1
  done
}

runServer() {
  while [[ $cnt -lt 1000 ]] ; do 
    logf="ssb-logs/$(date +%s).log"
    echo "Started scuttlebot on $(date)" > $logf
    time $sbot server 2>&1 | tee $logf;
    if [[ $? -ne 0 ]]; then
      postError $logf&
    fi
    cnt=$(( $cnt+1 ));
    sleep 1
  done
}

