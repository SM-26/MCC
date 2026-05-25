#!/bin/bash

# If this script was triggered by our own amend command, exit immediately to stop the loop!
if [ "$GIT_INFO_AMENDING" = "true" ]; then
    exit 0
fi

# Define the target path
TARGET_FILE="/home/sm26/MCC/public/git-info.txt"

# Get the absolute, real, brand new commit hash (short, 7 characters)
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Get the real commit message
COMMIT_MSG=$(git log -1 --pretty="%s" 2>/dev/null || echo "Unknown commit")

# Write the true data to the file
echo "$COMMIT_HASH" > "$TARGET_FILE"
echo "$COMMIT_MSG" >> "$TARGET_FILE"

# Stage the updated file
git add "$TARGET_FILE"

echo "Generated public/git-info.txt with true hash: $COMMIT_HASH"

# Amend the commit using our environment variable guard to block loops
export GIT_INFO_AMENDING="true"
git commit --amend --no-edit --no-verify
