#!/bin/bash

# If this script was triggered by our own amend command, exit immediately to stop the loop!
if [ "$GIT_INFO_AMENDING" = "true" ]; then
    exit 0
fi

# Define the target path
GIT_FILE="/home/sm26/MCC/public/MCC/git-info.txt"
VER_FILE="/home/sm26/MCC/public/MCC/version.txt"

# Get the absolute, real, brand new commit hash (short, 7 characters)
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Get the real commit message
COMMIT_MSG=$(git log -1 --pretty="%s" 2>/dev/null || echo "Unknown commit")

# Write the true data to the file
echo "$COMMIT_HASH" > "$GIT_FILE"
echo "$COMMIT_MSG" >> "$GIT_FILE"

# This grabs the version from package.json and strips everything else
grep -Po '"version": "\K[^"]*' /home/sm26/MCC/package.json > "$VER_FILE"

# Stage the updated files
git add "$GIT_FILE" "$VER_FILE"

echo "Generated git-info.txt and version.txt"

# Amend the commit using our environment variable guard to block loops
export GIT_INFO_AMENDING="true"
git commit --amend --no-edit --no-verify
