#!/bin/bash

source $(brew --prefix nvm)/nvm.sh
nvm use

PORT=7080 \
IS_LOCAL=1 \
iojs -harmony_arrow_functions  app.server.js
