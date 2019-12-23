#!/bin/bash
script_name=$0
script_full_path=$(dirname "$0")

cd $script_full_path
prettier --write *.js