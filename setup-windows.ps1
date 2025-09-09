# PuttIQ Windows Setup Script (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PuttIQ Windows Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Clean old installations
Write-Host "Cleaning old installations..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "Removing node_modules..."
    Remove-Item -Path "node_modules" -Recurse -Force
}
if (Test-Path "package-lock.json") {
    Write-Host "Removing package-lock.json..."
    Remove-Item -Path "package-lock.json" -Force
}
if (Test-Path ".expo") {
    Write-Host "Removing .expo cache..."
    Remove-Item -Path ".expo" -Recurse -Force
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
Write-Host ""

# Install all dependencies
npm install --legacy-peer-deps

Write-Host ""
Write-Host "Installing navigation packages specifically..." -ForegroundColor Yellow
npm install --legacy-peer-deps @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context

Write-Host ""
Write-Host "Verifying installation..." -ForegroundColor Yellow
npm list @react-navigation/native @react-navigation/bottom-tabs

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the app, run:" -ForegroundColor Cyan
Write-Host "  npx expo start --tunnel --clear" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")