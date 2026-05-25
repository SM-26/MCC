#!/bin/bash

# Get commit hash (short, 7 characters)
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Get commit message (first line only)
COMMIT_MSG=$(git log -1 --pretty="%s" 2>/dev/null || echo "Unknown commit")

# Write to file
echo "$COMMIT_HASH" > /home/sm26/MCC/git-info.txt
echo "$COMMIT_MSG" >> /home/sm26/MCC/git-info.txt

# Stage the file so it's included in the current commit
git add /home/sm26/MCC/git-info.txt

# echo "Generated git-info.txt:"
# cat /home/sm26/MCC/git-info.txt

echo "Generated and staged git-info.txt"
