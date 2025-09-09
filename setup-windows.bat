@echo off
echo ========================================
echo PuttIQ Windows Setup Script
echo ========================================
echo.

echo Cleaning old installations...
if exist node_modules (
    echo Removing node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo Removing package-lock.json...
    del package-lock.json
)

echo.
echo Installing dependencies...
echo This may take a few minutes...
echo.

call npm install --legacy-peer-deps

echo.
echo Installing navigation packages specifically...
call npm install --legacy-peer-deps @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context

echo.
echo Clearing Expo cache...
if exist .expo (
    rmdir /s /q .expo
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the app, run:
echo   npx expo start --tunnel --clear
echo.
pause