@echo off
echo ==================================================
echo Checking Go Proxy compilation locally...
echo ==================================================
go build -o server_test.exe .
if %ERRORLEVEL% equ 0 (
    echo [Success] Go compilation succeeded!
    del server_test.exe
    exit /b 0
) else (
    echo [Error] Go compilation failed. Please fix errors before pushing.
    exit /b 1
)
