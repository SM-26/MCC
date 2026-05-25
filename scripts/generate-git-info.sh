#!/bin/bash

# Define the target path
TARGET_FILE="/home/sm26/MCC/public/git-info.txt"

# Since the commit isn't finalized, the new hash doesn't exist yet.
# We fetch the current HEAD and append a "+" marker to signify "this commit will follow" 
# or use "next" so your UI accurately updates.
COMMIT_HASH="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")+"

# Capture the exact message you just typed in your text editor
if [ -f ".git/COMMIT_EDITMSG" ]; then
    COMMIT_MSG=$(head -n 1 .git/COMMIT_EDITMSG)
else
    COMMIT_MSG="Automated Commit"
fi

# Write to file
echo "$COMMIT_HASH" > "$TARGET_FILE"
echo "$COMMIT_MSG" >> "$TARGET_FILE"

# Stage the file inside the pre-commit environment
git add "$TARGET_FILE"

echo "Generated and staged public/git-info.txt cleanly within pre-commit"
