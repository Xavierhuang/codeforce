# Incremental Deployment Script
# Deploys files one by one with verification at each step

param(
    [string]$Password = "Hhwj65377068Hhwj",
    [string]$HostKey = "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4",
    [string]$Server = "root@143.198.24.72",
    [string]$BasePath = "/var/www/codeforce",
    [switch]$SkipBuild = $false,
    [switch]$SkipDatabase = $false
)

$ErrorActionPreference = "Stop"

function Deploy-File {
    param(
        [string]$LocalPath,
        [string]$RemotePath,
        [string]$Description
    )
    
    Write-Host "`n[$Description]" -ForegroundColor Cyan
    Write-Host "  Local:  $LocalPath" -ForegroundColor Gray
    Write-Host "  Remote: $RemotePath" -ForegroundColor Gray
    
    if (-not (Test-Path $LocalPath)) {
        Write-Host "  ERROR: Local file not found!" -ForegroundColor Red
        return $false
    }
    
    try {
        $result = & pscp -pw $Password -hostkey $HostKey $LocalPath "${Server}:${RemotePath}" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Deployed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ✗ Deployment failed: $result" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ✗ Error: $_" -ForegroundColor Red
        return $false
    }
}

function Run-Command {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "`n[$Description]" -ForegroundColor Cyan
    Write-Host "  Command: $Command" -ForegroundColor Gray
    
    try {
        $result = & plink -ssh $Server -pw $Password -hostkey $HostKey $Command 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Completed successfully" -ForegroundColor Green
            if ($result) {
                Write-Host "  Output: $result" -ForegroundColor Gray
            }
            return $true
        } else {
            Write-Host "  ✗ Failed: $result" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ✗ Error: $_" -ForegroundColor Red
        return $false
    }
}

function Verify-Build {
    Write-Host "`n[Verifying Build]" -ForegroundColor Cyan
    $result = Run-Command "cd $BasePath && test -f .next/BUILD_ID && echo 'Build exists' || echo 'Build missing'"
    return $result
}

# Start Deployment
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Incremental Deployment Script" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Phase 1: Database Schema
if (-not $SkipDatabase) {
    Write-Host "PHASE 1: Database Schema" -ForegroundColor Magenta
    Write-Host "=========================" -ForegroundColor Magenta
    
    if (-not (Deploy-File "prisma/schema.prisma" "$BasePath/prisma/schema.prisma" "Schema File")) {
        Write-Host "`nERROR: Schema deployment failed. Stopping." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`nGenerating Prisma Client..." -ForegroundColor Yellow
    if (-not (Run-Command "cd $BasePath && npx prisma generate")) {
        Write-Host "ERROR: Prisma generate failed. Stopping." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`nPushing database schema..." -ForegroundColor Yellow
    if (-not (Run-Command "cd $BasePath && npx prisma db push")) {
        Write-Host "ERROR: Database push failed. Stopping." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`n✓ Phase 1 Complete" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "Skipping database phase (--SkipDatabase flag)" -ForegroundColor Yellow
}

# Phase 2: Libraries
Write-Host "`nPHASE 2: Library Files" -ForegroundColor Magenta
Write-Host "======================" -ForegroundColor Magenta

if (-not (Deploy-File "lib/payment-handlers.ts" "$BasePath/lib/payment-handlers.ts" "Payment Handlers")) {
    Write-Host "WARNING: Payment handlers deployment failed, but continuing..." -ForegroundColor Yellow
}

Write-Host "`n✓ Phase 2 Complete" -ForegroundColor Green
Start-Sleep -Seconds 1

# Phase 3: API Routes
Write-Host "`nPHASE 3: API Routes" -ForegroundColor Magenta
Write-Host "===================" -ForegroundColor Magenta

if (-not (Deploy-File "app/api/v1/book/worker/route.ts" "$BasePath/app/api/v1/book/worker/route.ts" "Booking API Route")) {
    Write-Host "ERROR: Booking API deployment failed. Stopping." -ForegroundColor Red
    exit 1
}

if (-not (Deploy-File "app/api/v1/files/[fileId]/route.ts" "$BasePath/app/api/v1/files/[fileId]/route.ts" "File Serving Route")) {
    Write-Host "ERROR: File serving route deployment failed. Stopping." -ForegroundColor Red
    exit 1
}

# Create assignment-files directory
Write-Host "`nCreating assignment-files directory..." -ForegroundColor Yellow
Run-Command "mkdir -p $BasePath/app/api/v1/tasks/[id]/assignment-files" | Out-Null

if (-not (Deploy-File "app/api/v1/tasks/[id]/assignment-files/route.ts" "$BasePath/app/api/v1/tasks/[id]/assignment-files/route.ts" "Assignment Files API Route")) {
    Write-Host "ERROR: Assignment files API deployment failed. Stopping." -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ Phase 3 Complete" -ForegroundColor Green
Start-Sleep -Seconds 1

# Phase 4: Components
Write-Host "`nPHASE 4: Component Files" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta

if (-not (Deploy-File "components/TaskAssignmentFileUpload.tsx" "$BasePath/components/TaskAssignmentFileUpload.tsx" "Task Assignment File Upload Component")) {
    Write-Host "ERROR: File upload component deployment failed. Stopping." -ForegroundColor Red
    exit 1
}

if (-not (Deploy-File "components/TaskDetail.tsx" "$BasePath/components/TaskDetail.tsx" "Task Detail Component")) {
    Write-Host "ERROR: Task detail component deployment failed. Stopping." -ForegroundColor Red
    exit 1
}

if (-not (Deploy-File "app/book/[slug]/page.tsx" "$BasePath/app/book/[slug]/page.tsx" "Booking Form Page")) {
    Write-Host "ERROR: Booking form deployment failed. Stopping." -ForegroundColor Red
    exit 1
}

if (-not (Deploy-File "components/Wallet.tsx" "$BasePath/components/Wallet.tsx" "Wallet Component")) {
    Write-Host "ERROR: Wallet component deployment failed. Stopping." -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ Phase 4 Complete" -ForegroundColor Green
Start-Sleep -Seconds 1

# Phase 5: Build & Restart
if (-not $SkipBuild) {
    Write-Host "`nPHASE 5: Build & Restart" -ForegroundColor Magenta
    Write-Host "========================" -ForegroundColor Magenta
    
    Write-Host "`nCleaning previous build..." -ForegroundColor Yellow
    Run-Command "cd $BasePath && rm -rf .next" | Out-Null
    
    Write-Host "`nBuilding application (this may take 2-5 minutes)..." -ForegroundColor Yellow
    if (-not (Run-Command "cd $BasePath && npm run build")) {
        Write-Host "ERROR: Build failed. Check logs above." -ForegroundColor Red
        exit 1
    }
    
    if (-not (Verify-Build)) {
        Write-Host "ERROR: Build verification failed." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`nRestarting application..." -ForegroundColor Yellow
    if (-not (Run-Command "cd $BasePath && pm2 restart codeforce --update-env")) {
        Write-Host "ERROR: PM2 restart failed." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`nWaiting for application to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    Write-Host "`nChecking application status..." -ForegroundColor Yellow
    Run-Command "pm2 status codeforce"
    
    Write-Host "`nChecking recent logs..." -ForegroundColor Yellow
    Run-Command "pm2 logs codeforce --lines 10 --nostream | grep -E 'error|Error|ready|Ready|started|Started' || echo 'No critical errors found'"
    
    Write-Host "`n✓ Phase 5 Complete" -ForegroundColor Green
} else {
    Write-Host "Skipping build phase (--SkipBuild flag)" -ForegroundColor Yellow
    Write-Host "Remember to build and restart manually!" -ForegroundColor Yellow
}

# Final Summary
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test booking form with weekly hour limit" -ForegroundColor White
Write-Host "  2. Test file upload in task assignment" -ForegroundColor White
Write-Host "  3. Test wallet page improvements" -ForegroundColor White
Write-Host "  4. Test task detail page UI improvements" -ForegroundColor White
Write-Host ""
Write-Host "If issues occur, check:" -ForegroundColor Yellow
Write-Host "  - PM2 logs: pm2 logs codeforce --lines 50" -ForegroundColor Gray
Write-Host "  - Build output: Check for TypeScript errors" -ForegroundColor Gray
Write-Host "  - Database: Verify schema changes applied" -ForegroundColor Gray
Write-Host ""


