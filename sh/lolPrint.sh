#!/usr/bin/env bash
clear;
while true; do 
        $@ | lolcat; 
        echo -ne "[H";
        /usr/bin/sleep 0.2;
done


