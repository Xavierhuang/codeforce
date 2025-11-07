@echo off
echo Testing SSH connection...
plink -batch -ssh root@143.198.24.72 -pw Hhwj65377068Hhwj "whoami && hostname && uptime"
echo.
echo Connection test complete.
pause

