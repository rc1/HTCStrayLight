#!/bin/bash

if [ "$(uname)" == "Darwin" ]; then
    echo "System: OSX"
    source $(brew --prefix nvm)/nvm.sh
    nvm use
	gulp && gulp watch
elif [[ $OSTYPE == "linux-gnueabihf" ]]; then
    # Do something under Mac OS X platform
    echo "System: Raspberry Pi 2"
    # Do something under Mac OS X platform
    echo "System: Raspberry Pi 2"
    echo "Warning: Files may not build on Raspberry Pi. Compile on OSX and commit"
    gulp && gulp watch
elif [ "$(uname)" == "Linux" ]; then
    echo "System: Linux"
fi
