#!/bin/bash

for i in $(seq 1 200); do
  echo $i > commits_counter.txt
  git add commits_counter.txt
  git commit -m "Commit $i: Update counter to $i"
done