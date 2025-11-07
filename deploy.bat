@echo off
REM Skillyy Deployment Script for Windows
REM This script deploys all changes to the production server

set SERVER=root@143.198.24.72
set SERVER_PATH=/var/www/codeforce
set PASSWORD=Hhwj65377068Hhwj
set HOSTKEY=ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4

echo 🚀 Starting deployment to Skillyy...

REM Step 1: Upload all application files
echo 📤 Uploading files...
pscp -pw %PASSWORD% -hostkey "%HOSTKEY%" -r app %SERVER%:%SERVER_PATH%/
pscp -pw %PASSWORD% -hostkey "%HOSTKEY%" -r components %SERVER%:%SERVER_PATH%/
pscp -pw %PASSWORD% -hostkey "%HOSTKEY%" -r lib %SERVER%:%SERVER_PATH%/
pscp -pw %PASSWORD% -hostkey "%HOSTKEY%" -r public %SERVER%:%SERVER_PATH%/
pscp -pw %PASSWORD% -hostkey "%HOSTKEY%" next.config.js %SERVER%:%SERVER_PATH%/
pscp -pw %PASSWORD% -hostkey "%HOSTKEY%" package.json %SERVER%:%SERVER_PATH%/
pscp -pw %PASSWORD% -hostkey "%HOSTKEY%" tsconfig.json %SERVER%:%SERVER_PATH%/
pscp -pw %PASSWORD% -hostkey "%HOSTKEY%" tailwind.config.ts %SERVER%:%SERVER_PATH%/
pscp -pw %PASSWORD% -hostkey "%HOSTKEY%" postcss.config.js %SERVER%:%SERVER_PATH%/

echo ✅ Files uploaded

REM Step 2: Connect and rebuild
echo 🔨 Building application...
plink -ssh %SERVER% -pw %PASSWORD% -hostkey "%HOSTKEY%" "cd %SERVER_PATH% && npm install && npm run build"

REM Step 3: Restart PM2
echo 🔄 Restarting application...
plink -ssh %SERVER% -pw %PASSWORD% -hostkey "%HOSTKEY%" "cd %SERVER_PATH% && pm2 restart codeforce || pm2 start ecosystem.config.js"

echo ✅ Deployment complete!
echo 🌐 Site: https://skillyy.com
pause

