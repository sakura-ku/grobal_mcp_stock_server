# スクリプトの説明を表示するPowerShellスクリプト
param (
    [string]$ScriptName
)

Write-Host "スクリプトを実行中..." -ForegroundColor Yellow

# パスの構築
$scriptPath = $MyInvocation.MyCommand.Path
$scriptDir = Split-Path -Parent $scriptPath
$repoRoot = Split-Path -Parent $scriptDir
$packageJsonPath = Join-Path -Path $repoRoot -ChildPath "package.json"

Write-Host "package.jsonのパス: $packageJsonPath" -ForegroundColor Yellow

# ファイルが存在するか確認
if (Test-Path $packageJsonPath) {
    Write-Host "package.jsonファイルが見つかりました" -ForegroundColor Green
} else {
    Write-Host "package.jsonファイルが見つかりません: $packageJsonPath" -ForegroundColor Red
    exit 1
}

# package.jsonの内容を表示（テスト用）
Write-Host "package.jsonの内容（先頭部分）:" -ForegroundColor Yellow
Get-Content -Path $packageJsonPath -TotalCount 5

# package.jsonの読み込みを試行
try {
    $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json
    Write-Host "package.jsonを正常に読み込みました" -ForegroundColor Green
    
    # scriptsセクションの存在確認
    if (Get-Member -InputObject $packageJson -Name "scripts" -MemberType Properties) {
        Write-Host "scriptsセクションが見つかりました" -ForegroundColor Green
        
        # 一部のスクリプト名を表示（テスト用）
        $scriptCount = ($packageJson.scripts.PSObject.Properties | Measure-Object).Count
        Write-Host "スクリプト数: $scriptCount" -ForegroundColor Yellow
        
        if ($scriptCount -gt 0) {
            $firstScript = $packageJson.scripts.PSObject.Properties | Select-Object -First 1
            Write-Host "最初のスクリプト: $($firstScript.Name) = $($firstScript.Value)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "scriptsセクションが見つかりません" -ForegroundColor Red
    }
    
    # scriptsDescriptionセクションの存在確認
    if (Get-Member -InputObject $packageJson -Name "scriptsDescription" -MemberType Properties) {
        Write-Host "scriptsDescriptionセクションが見つかりました" -ForegroundColor Green
    } else {
        Write-Host "scriptsDescriptionセクションが見つかりません" -ForegroundColor Red
    }
} catch {
    Write-Host "エラーが発生しました: $_" -ForegroundColor Red
} 