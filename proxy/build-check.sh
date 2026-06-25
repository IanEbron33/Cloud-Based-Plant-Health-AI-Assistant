#!/bin/sh
echo "=================================================="
echo "Checking Go Proxy compilation locally..."
echo "=================================================="
go build -o server_test .
if [ $? -eq 0 ]; then
    echo "[Success] Go compilation succeeded!"
    rm server_test
    exit 0
else
    echo "[Error] Go compilation failed. Please fix errors before pushing."
    exit 1
fi
