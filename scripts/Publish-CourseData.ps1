param(
  [string]$CourseJson = "$env:USERPROFILE\Downloads\course.json",
  [string]$CommitMessage = "Update course content"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$source = Resolve-Path -LiteralPath $CourseJson
$target = Join-Path $repoRoot "data\course.json"

$jsonText = Get-Content -LiteralPath $source -Raw -Encoding UTF8
$course = $jsonText | ConvertFrom-Json

if (-not $course.site -or -not $course.lessons) {
  throw "course.json must contain site and lessons."
}

Set-Content -LiteralPath $target -Value $jsonText -Encoding UTF8

Push-Location $repoRoot
try {
  git diff -- data/course.json
  $status = git status --short data/course.json
  if (-not $status) {
    Write-Host "No course data changes to publish."
    exit 0
  }

  git add data/course.json
  git commit -m $CommitMessage
  git push origin main
  Write-Host "Published course data to GitHub."
}
finally {
  Pop-Location
}
