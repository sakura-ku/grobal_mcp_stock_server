# テスト実行用ヘルパースクリプト
# プロジェクトのテスト実行を効率化するためのPowerShell関数集

# 環境変数設定
function Set-TestEnvironment {
    param (
        [string]$EnvFile = ".env.test"
    )
    
    if (Test-Path $EnvFile) {
        Write-Host "🔧 テスト環境変数を設定中: $EnvFile" -ForegroundColor Cyan
        Get-Content $EnvFile | ForEach-Object {
            if (-not [string]::IsNullOrWhiteSpace($_) -and -not $_.StartsWith('#')) {
                $key, $value = $_ -split '=', 2
                if ($key -and $value) {
                    [Environment]::SetEnvironmentVariable($key, $value, "Process")
                    Write-Host "  ✓ $key を設定しました" -ForegroundColor DarkGray
                }
            }
        }
        Write-Host "✅ 環境変数の設定が完了しました" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 警告: $EnvFile が見つかりません。デフォルト値を使用します。" -ForegroundColor Yellow
        [Environment]::SetEnvironmentVariable("NODE_ENV", "test", "Process")
    }
}

# テスト実行関数
function Invoke-Tests {
    param (
        [string]$Pattern = "",
        [switch]$Watch = $false,
        [switch]$Coverage = $false,
        [switch]$Verbose = $false
    )
    
    Set-TestEnvironment
    
    $jestArgs = @()
    
    if ($Pattern) {
        $jestArgs += "-t", $Pattern
    }
    
    if ($Watch) {
        $jestArgs += "--watch"
    }
    
    if ($Coverage) {
        $jestArgs += "--coverage"
    }
    
    if ($Verbose) {
        $jestArgs += "--verbose"
    }
    
    Write-Host "🧪 テストを実行中..." -ForegroundColor Cyan
    
    $startTime = Get-Date
    npm test -- $jestArgs
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Host "⏱️ テスト実行時間: $($duration.TotalSeconds.ToString("0.00")) 秒" -ForegroundColor Cyan
}

# データベースリセット関数
function Reset-TestDatabase {
    param (
        [string]$DbName = "test_db",
        [string]$DbUser = "postgres",
        [string]$DbPassword = "postgres",
        [string]$DbHost = "localhost",
        [int]$DbPort = 5432
    )
    
    Write-Host "🗄️ テストデータベースをリセットしています..." -ForegroundColor Cyan
    
    try {
        # 環境変数からデータベース接続情報を取得（設定されている場合）
        if ($env:DATABASE_URL) {
            # postgres://user:password@localhost:5432/test_db 形式から情報を抽出
            $regex = "postgres://(.*?):(.*?)@(.*?):(\d+)/(.*)"
            if ($env:DATABASE_URL -match $regex) {
                $DbUser = $matches[1]
                $DbPassword = $matches[2]
                $DbHost = $matches[3]
                $DbPort = $matches[4]
                $DbName = $matches[5]
            }
        }

        # PostgreSQLコマンドを実行
        $env:PGPASSWORD = $DbPassword
        
        # データベースを再作成
        Invoke-Expression "psql -h $DbHost -p $DbPort -U $DbUser -c 'DROP DATABASE IF EXISTS $DbName;'"
        Invoke-Expression "psql -h $DbHost -p $DbPort -U $DbUser -c 'CREATE DATABASE $DbName;'"
        
        # マイグレーションを実行
        Write-Host "🔄 マイグレーションを実行中..." -ForegroundColor Cyan
        npx prisma migrate deploy
        
        # シードデータを投入
        Write-Host "🌱 テストデータをシードしています..." -ForegroundColor Cyan
        npm run seed:test
        
        Write-Host "✅ データベースのリセットが完了しました" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ データベースリセット中にエラーが発生しました: $_" -ForegroundColor Red
    }
    finally {
        # 環境変数をクリア
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# カバレッジレポート生成関数
function New-CoverageReport {
    param (
        [switch]$OpenReport = $false
    )
    
    Write-Host "📊 テストカバレッジレポートを生成しています..." -ForegroundColor Cyan
    
    npm test -- --coverage
    
    if ($OpenReport -and (Test-Path "coverage/lcov-report/index.html")) {
        Write-Host "🌐 レポートをブラウザで開いています..." -ForegroundColor Cyan
        Start-Process "coverage/lcov-report/index.html"
    }
}

# 特定のファイルに関連するテストのみを実行
function Invoke-FileTests {
    param (
        [Parameter(Mandatory=$true)]
        [string]$FilePath,
        [switch]$Watch = $false
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ 指定されたファイルが見つかりません: $FilePath" -ForegroundColor Red
        return
    }
    
    $fileInfo = Get-Item $FilePath
    $fileName = $fileInfo.BaseName
    
    Write-Host "🔍 '$fileName' に関連するテストを検索中..." -ForegroundColor Cyan
    
    $jestArgs = @("--findRelatedTests", $FilePath)
    
    if ($Watch) {
        $jestArgs += "--watch"
    }
    
    Set-TestEnvironment
    npm test -- $jestArgs
}

# 失敗したテストのみを再実行
function Invoke-FailedTests {
    param (
        [switch]$Watch = $false
    )
    
    Write-Host "🔄 失敗したテストを再実行中..." -ForegroundColor Cyan
    
    $jestArgs = @("--onlyFailures")
    
    if ($Watch) {
        $jestArgs += "--watch"
    }
    
    Set-TestEnvironment
    npm test -- $jestArgs
}

# テスト実行環境のクリーンアップ
function Clear-TestEnvironment {
    Write-Host "🧹 テスト環境をクリーンアップしています..." -ForegroundColor Cyan
    
    # テスト用の一時ファイルを削除
    if (Test-Path "temp") {
        Remove-Item -Path "temp" -Recurse -Force
    }
    
    # キャッシュをクリア
    if (Test-Path "node_modules/.cache") {
        Remove-Item -Path "node_modules/.cache" -Recurse -Force
    }
    
    # Jest キャッシュをクリア
    npm test -- --clearCache
    
    Write-Host "✅ テスト環境のクリーンアップが完了しました" -ForegroundColor Green
}

# エクスポート関数
Export-ModuleMember -Function Set-TestEnvironment, Invoke-Tests, Reset-TestDatabase, 
                              New-CoverageReport, Invoke-FileTests, Invoke-FailedTests,
                              Clear-TestEnvironment

# 使用例を表示
function Show-TestHelp {
    Write-Host "`nテストヘルパースクリプトの使用方法:`n" -ForegroundColor Cyan
    
    Write-Host "環境変数の設定:" -ForegroundColor Yellow
    Write-Host "  Set-TestEnvironment -EnvFile '.env.test'"
    
    Write-Host "`nテストの実行:" -ForegroundColor Yellow
    Write-Host "  Invoke-Tests                          # すべてのテストを実行"
    Write-Host "  Invoke-Tests -Pattern 'UserService'   # 特定のパターンに一致するテストを実行"
    Write-Host "  Invoke-Tests -Watch                   # 監視モードでテストを実行"
    Write-Host "  Invoke-Tests -Coverage                # カバレッジレポート付きでテストを実行"
    
    Write-Host "`nデータベースのリセット:" -ForegroundColor Yellow
    Write-Host "  Reset-TestDatabase                    # テストデータベースをリセット"
    
    Write-Host "`nカバレッジレポートの生成:" -ForegroundColor Yellow
    Write-Host "  New-CoverageReport -OpenReport        # カバレッジレポートを生成しブラウザで開く"
    
    Write-Host "`n特定のファイルに関連するテストの実行:" -ForegroundColor Yellow
    Write-Host "  Invoke-FileTests -FilePath 'src/services/UserService.ts'"
    
    Write-Host "`n失敗したテストの再実行:" -ForegroundColor Yellow
    Write-Host "  Invoke-FailedTests"
    
    Write-Host "`nテスト環境のクリーンアップ:" -ForegroundColor Yellow
    Write-Host "  Clear-TestEnvironment"
    
    Write-Host ""
}

# スクリプトが直接実行された場合はヘルプを表示
if ($MyInvocation.InvocationName -eq $MyInvocation.MyCommand.Name) {
    Show-TestHelp
} 