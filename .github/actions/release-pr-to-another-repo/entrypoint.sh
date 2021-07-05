#!/bin/sh

set -e
set -x

if [ $INPUT_DESTINATION_HEAD_BRANCH_PREFIX == "main" ] || [ $INPUT_DESTINATION_HEAD_BRANCH_PREFIX == "master"]
then
  echo "Destination head branch cannot be 'main' nor 'master'"
  return -1
fi

if [ -z "$INPUT_PULL_REQUEST_REVIEWERS" ]
then
  PULL_REQUEST_REVIEWERS=$INPUT_PULL_REQUEST_REVIEWERS
else
  PULL_REQUEST_REVIEWERS='-r '$INPUT_PULL_REQUEST_REVIEWERS
fi

CLONE_DIR=$(mktemp -d)
INPUT_DESTINATION_HEAD_BRANCH="$INPUT_DESTINATION_HEAD_BRANCH_PREFIX-$GITHUB_REF"

echo "Setting git variables"
export GITHUB_TOKEN=$API_TOKEN_GITHUB
git config --global user.email "$INPUT_USER_EMAIL"
git config --global user.name "$INPUT_USER_NAME"

echo "Cloning destination git repository"
git clone "https://$API_TOKEN_GITHUB@github.com/$INPUT_DESTINATION_REPO.git" "$CLONE_DIR"
cd "$CLONE_DIR"
git checkout -b "$INPUT_DESTINATION_HEAD_BRANCH"

echo "Update the TiDB Dashboard"
go get -d "github.com/pingcap/tidb-dashboard@$GITHUB_REF"
go mod tidy
make pd-server
go mod tidy

echo "Adding git commit"
git add .
if git status | grep -q "Changes to be committed"
then
  git commit --message "Update from https://github.com/$GITHUB_REPOSITORY/commit/$GITHUB_SHA, release version: $GITHUB_REF"
  echo "Creating a pull request"
  gh pr create -t $INPUT_DESTINATION_HEAD_BRANCH \
               -b $INPUT_DESTINATION_HEAD_BRANCH \
               -B $INPUT_DESTINATION_BASE_BRANCH \
               -H $INPUT_DESTINATION_HEAD_BRANCH \
                  $PULL_REQUEST_REVIEWERS
else
  echo "No changes detected"
fi
