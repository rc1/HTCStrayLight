#!/bin/bash

source $(brew --prefix nvm)/nvm.sh
nvm use

gulp && gulp watch
