#!/usr/bin/env bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

errorRoot="%DQnc50C8nZzwDxdJYSVs+yHs/NKioXywStTcE+WPqGs=.sha256"

cnt=1

die() {
  printf -- "Error: %s\n" "$1"
  exit 1
}

sbot=sbot
test -f $sbot || sbot=~/node_modules/.bin/sbot
test -f $sbot || die "please install sbot into \$PATH"

# TODO:
export IPFS_PATH=/home/cryptix/.ipfs
ipfs=ipfs
test -f $ipfs || ipfs=/usr/local/bin/ipfs
test -f $ipfs || die "please install ipfs into \$PATH"


postError() {
  local fname=$1;

  test -f $fname || die "no such file: $fname"
  
  pollServer;

  trace=$(findTraceStart $fname)
  msg="[restarted] [count:$cnt] [last log](https://ipfs.io/ipfs/$trace)"
  $sbot publish --type post --root $errorRoot --branch $errorRoot  --text "$msg"
}


findTraceStart() {
  local fname=$1;
  test -f $fname || die "no such logfile: $fname"

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
    if [ $lastLine -eq 0 ]
    then 
	#echo "findTrace: reached negative line count. defaulting..";
	i=10
	break
    fi
    if [ $i -gt 100 ]
    then
	#echo "findTrace: looked far enough";
	i=10
	break
    fi 
  done

  local logHash=$(tail -n $i $fname | $ipfs add -q -s rabin)
  echo $logHash 
}



pollServer() {
  local dst=/dev/tcp/localhost/6666
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
    logf="/var/log/ssb/$(date +%s).log"
    touch $logf || die "could not create logfile: $logf"
    echo "Started scuttlebot on $(date)" > $logf
    tail -f $logf&
    TAIL_PID=$!
    $sbot server 2>&1 > $logf;
    if [[ $? -ne 0 ]]; then
      postError $logf&
    fi
    kill $TAIL_PID
    cnt=$(( $cnt+1 ));
    sleep 1
  done
}

# include to arm
#runServer;

