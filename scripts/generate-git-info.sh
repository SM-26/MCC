#!/bin/bash

# Define the target path
TARGET_FILE="/home/sm26/MCC/public/git-info.txt"

# Get commit hash (short, 7 characters)
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Get commit message (first line only)
COMMIT_MSG=$(git log -1 --pretty="%s" 2>/dev/null || echo "Unknown commit")

# Write to file
echo "$COMMIT_HASH" > "$TARGET_FILE"
echo "$COMMIT_MSG" >> "$TARGET_FILE"

# Stage the file
git add "$TARGET_FILE"

echo "Generated and staged public/git-info.txt"
