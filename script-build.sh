#!/bin/bash

if [ "$(uname)" == "Darwin" ]; then
    echo "System: OSX"
    source $(brew --prefix nvm)/nvm.sh
    nvm use
    gulp
elif [[ $OSTYPE == "linux-gnueabihf" ]]; then
    # Do something under Mac OS X platform
    echo "System: Raspberry Pi 2"
    echo "Warning: Files may not build on Raspberry Pi. Compile on OSX and commit"
    gulp
elif [ "$(uname)" == "Linux" ]; then
    echo "System: Linux"
fi


