@echo off
echo ========================================
echo Fixing SafeArea Context Error
echo ========================================
echo.

echo Installing react-native-safe-area-context...
call npm uninstall react-native-safe-area-context
call npm install react-native-safe-area-context@4.11.2 --legacy-peer-deps

echo.
echo Clearing cache...
if exist .expo (
    rmdir /s /q .expo
)

echo.
echo If error persists, try:
echo   npx expo install react-native-safe-area-context
echo.
echo Then restart with:
echo   npx expo start --tunnel --clear
echo.
pause