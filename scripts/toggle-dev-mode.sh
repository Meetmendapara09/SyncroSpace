#!/bin/bash

# Script to toggle development mode in Firebase security rules
# Usage: ./toggle-dev-mode.sh [on|off]

# Check if argument is provided
if [ $# -ne 1 ]; then
  echo "Usage: ./toggle-dev-mode.sh [on|off]"
  exit 1
fi

RULES_FILE="firestore.rules"

if [ "$1" = "on" ]; then
  # Set development mode ON
  sed -i 's/function isDevelopment() {\n        return false; \/\/ Set to false for production security rules/function isDevelopment() {\n        return true; \/\/ Set to true for development mode/' $RULES_FILE
  echo "Development mode turned ON"
elif [ "$1" = "off" ]; then
  # Set development mode OFF
  sed -i 's/function isDevelopment() {\n        return true; \/\/ Set to true for development mode/function isDevelopment() {\n        return false; \/\/ Set to false for production security rules/' $RULES_FILE
  echo "Development mode turned OFF (production mode enabled)"
else
  echo "Invalid argument. Use 'on' or 'off'"
  exit 1
fi

echo "Remember to deploy the updated rules: firebase deploy --only firestore:rules"