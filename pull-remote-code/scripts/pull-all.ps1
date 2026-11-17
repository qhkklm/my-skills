<#
.SYNOPSIS
  拉取指定根目录下所有 git 仓库的最新远程代码（快进式），脏工作区安全跳过。

.DESCRIPTION
  从 -Root（默认：本脚本目录向上 4 级）开始递归查找所有含 .git 的目录，
  对每个仓库执行：fetch --all --prune -> 读取当前分支 upstream -> 快进合并。
  纯通用实现，不耦合任何具体项目结构或业务。

  - 工作区有未提交改动（含暂存/未跟踪）时不合并，仅 fetch，标记 DIRTY_SKIPPED。
  - 落后 0 提交标记 UP_TO_DATE；快进成功标记 FAST_FORWARD；分叉标记 DIVERGED 需人工处理。
  - 不做 reset --hard、不 force、不 stash、不丢弃任何本地改动。
  - node_modules / .pnpm / vendor 内的 .git 一律忽略。

.PARAMETER Root
  扫描起始目录。默认取脚本所在目录上 4 级；不确定时显式传入。

.PARAMETER IgnoreDir
  额外忽略的目录名（正则），默认匹配 node_modules / .pnpm / vendor / .venv。

.EXAMPLE
  pwsh -File pull-all.ps1 -Root "C:\path\to\workspace"
#>
[CmdletBinding()]
param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '../../../..') -ErrorAction SilentlyContinue).Path,
  [string]$IgnoreDir = '(^|[\\/])(node_modules|\.pnpm|vendor|\.venv)([\\/]|$)'
)

$ErrorActionPreference = 'Continue'
$env:GIT_TERMINAL_PROMPT = '0'

if (-not $Root) {
  Write-Error '未提供 -Root，且无法从脚本位置推断根目录。请显式传入。'
  exit 2
}
if (-not (Test-Path $Root)) {
  Write-Error "Root 不存在: $Root"
  exit 2
}

Write-Host "扫描根目录: $Root" -ForegroundColor Cyan

$repos = Get-ChildItem -Path $Root -Recurse -Force -Directory -Filter '.git' -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch $IgnoreDir } |
  ForEach-Object { $_.Parent.FullName } |
  Sort-Object -Unique

if (-not $repos) {
  Write-Host '未发现任何 git 仓库。' -ForegroundColor Yellow
  exit 0
}

$results = @()

foreach ($repo in $repos) {
  $name = Split-Path $repo -Leaf
  Write-Host "`n==== $name  ($repo) ====" -ForegroundColor Magenta

  $dirty  = git -C $repo status --porcelain 2>$null
  $branch = git -C $repo rev-parse --abbrev-ref HEAD 2>$null
  if (-not $branch -or $branch -eq 'HEAD') {
    Write-Host '  跳过：分离 HEAD 状态' -ForegroundColor Yellow
    $results += [pscustomobject]@{ Repo = $name; Branch = $branch; Status = 'DETACHED_HEAD'; Detail = '' }
    continue
  }

  git -C $repo fetch --all --prune 2>&1 | Out-Null

  $upstream = git -C $repo rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null
  if (-not $upstream) {
    Write-Host "  跳过：分支 $branch 未设置 upstream" -ForegroundColor Yellow
    $results += [pscustomobject]@{ Repo = $name; Branch = $branch; Status = 'NO_UPSTREAM'; Detail = '' }
    continue
  }

  $lr = git -C $repo rev-list --left-right --count "HEAD...$upstream" 2>$null
  $ahead, $behind = ($lr -split '\s+')[0, 1]

  if ($dirty) {
    Write-Host "  脏工作区：仅 fetch，不合并（落后 $behind）" -ForegroundColor Yellow
    $results += [pscustomobject]@{ Repo = $name; Branch = $branch; Status = 'DIRTY_SKIPPED'; Detail = "落后 $behind" }
    continue
  }

  if ([int]$behind -eq 0) {
    Write-Host "  已是最新 (ahead=$ahead, behind=0)" -ForegroundColor Green
    $results += [pscustomobject]@{ Repo = $name; Branch = $branch; Status = 'UP_TO_DATE'; Detail = "ahead $ahead" }
    continue
  }

  if ([int]$ahead -gt 0) {
    Write-Host "  已分叉：本地领先 $ahead / 落后 $behind，需人工处理" -ForegroundColor Red
    $results += [pscustomobject]@{ Repo = $name; Branch = $branch; Status = 'DIVERGED'; Detail = "ahead $ahead / behind $behind" }
    continue
  }

  $merge = git -C $repo merge --ff-only $upstream 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  快进成功 -> $upstream (behind $behind)" -ForegroundColor Green
    $results += [pscustomobject]@{ Repo = $name; Branch = $branch; Status = 'FAST_FORWARD'; Detail = "+$behind" }
  } else {
    Write-Host "  快进失败：$merge" -ForegroundColor Red
    $results += [pscustomobject]@{ Repo = $name; Branch = $branch; Status = 'FF_FAILED'; Detail = ($merge -join ' ') }
  }
}

Write-Host "`n==== 汇总 ====" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$blocked = $results | Where-Object { $_.Status -in @('DIRTY_SKIPPED', 'DIVERGED', 'FF_FAILED', 'NO_UPSTREAM', 'DETACHED_HEAD') }
if ($blocked) {
  Write-Host '有仓库未完成同步（见上表），编码前请先处置。' -ForegroundColor Yellow
  exit 1
}

Write-Host '全部仓库已同步到最新。' -ForegroundColor Green
exit 0
