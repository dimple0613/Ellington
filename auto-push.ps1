$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repo

& git config user.name "kartikgohil"
& git config user.email "kartikgohil@360incemail.com"

$lastState = ""

Write-Host "[Auto-Push] Watching $repo (as kartikgohil). Will ask before every push. Ctrl+C to stop."

while ($true) {
    try {
        $state = (git status --porcelain 2>&1) | Out-String

        if ($state.Trim() -ne "" -and $state -ne $lastState) {
            Write-Host ""
            Write-Host "=== CHANGES DETECTED $(Get-Date -Format 'HH:mm:ss') ==="
            (git status --short 2>&1) | ForEach-Object { Write-Host "  $_" }
            Write-Host "==============================================="

            $choice = Read-Host "Stage, commit and push now? [y/N]"
            if ($choice -match '^[yY]') {
                git add -A 2>&1 | Out-Null
                $staged = (git diff --cached --name-only 2>&1 | Measure-Object -Line).Lines
                if ($staged -gt 0) {
                    $msg = "Auto-commit: $((Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))"
                    & git commit -m $msg 2>&1 | Out-Host
                    & git push 2>&1 | Out-Host
                    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Pushed $staged file(s) as kartikgohil"
                }
                $lastState = $state
            } else {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Skipped (you declined). Will not re-ask until files change again."
                $lastState = $state
            }
        }
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Error: $_"
    }

    Start-Sleep -Seconds 30
}