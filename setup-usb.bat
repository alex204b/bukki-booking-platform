@echo off
echo Setting up USB port forwarding for Android development...
C:\Users\37369\AppData\Local\Android\Sdk\platform-tools\adb.exe reverse tcp:3000 tcp:3000
C:\Users\37369\AppData\Local\Android\Sdk\platform-tools\adb.exe reverse tcp:3001 tcp:3001
echo.
echo Port forwarding setup complete!
echo Backend: localhost:3000 -^> Computer port 3000
echo Frontend: localhost:3001 -^> Computer port 3001
echo.
pause
