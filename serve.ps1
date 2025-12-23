param(
  [int]$Port = 8000,
  [string]$Root = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-ContentType([string]$path) {
  $ext = [IO.Path]::GetExtension($path).ToLowerInvariant()
  switch ($ext) {
    '.html' { 'text/html; charset=utf-8' }
    '.htm'  { 'text/html; charset=utf-8' }
    '.css'  { 'text/css; charset=utf-8' }
    '.js'   { 'application/javascript; charset=utf-8' }
    '.json' { 'application/json; charset=utf-8' }
    '.svg'  { 'image/svg+xml' }
    '.png'  { 'image/png' }
    '.jpg'  { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.gif'  { 'image/gif' }
    '.webp' { 'image/webp' }
    '.mp3'  { 'audio/mpeg' }
    '.wav'  { 'audio/wav' }
    default { 'application/octet-stream' }
  }
}

$rootFull = [IO.Path]::GetFullPath($Root)
$prefix1 = "http://localhost:$Port/"
$prefix2 = "http://127.0.0.1:$Port/"

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix1)
$listener.Prefixes.Add($prefix2)

Write-Host "Servindo arquivos de: $rootFull" -ForegroundColor Cyan
Write-Host "Abra no navegador:" -ForegroundColor Cyan
Write-Host "  $prefix1" -ForegroundColor Green
Write-Host "  $prefix2" -ForegroundColor Green
Write-Host "(Para parar: Ctrl+C)" -ForegroundColor Yellow

try {
  $listener.Start()
} catch {
  Write-Host "Falha ao iniciar o servidor na porta $Port." -ForegroundColor Red
  Write-Host "Tente outra porta: .\\serve.ps1 -Port 8080" -ForegroundColor Yellow
  throw
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $req = $ctx.Request
    $res = $ctx.Response

    # Evita conexões penduradas em alguns navegadores
    $res.KeepAlive = $false
    $res.Headers['Connection'] = 'close'

    # Em dev: diminui problemas de cache (inclui favicon)
    $res.Headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    $res.Headers['Pragma'] = 'no-cache'
    $res.Headers['Expires'] = '0'

    # Só suportamos GET/HEAD
    if ($req.HttpMethod -ne 'GET' -and $req.HttpMethod -ne 'HEAD') {
      $res.StatusCode = 405
      $bytes = [Text.Encoding]::UTF8.GetBytes('405 Method Not Allowed')
      $res.ContentType = 'text/plain; charset=utf-8'
      $res.ContentLength64 = $bytes.Length
      if ($req.HttpMethod -ne 'HEAD') {
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      }
      $res.Close()
      continue
    }

    $rawPath = $req.Url.AbsolutePath
    if ([string]::IsNullOrWhiteSpace($rawPath)) { $rawPath = '/' }

    $rel = [Uri]::UnescapeDataString($rawPath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }

    # Alias comum: muitos navegadores pedem /favicon.ico automaticamente
    if ($rel -ieq 'favicon.ico') { $rel = 'assets/favicon.png' }

    # Se pedir uma pasta, tenta index.html
    if ($rel.EndsWith('/')) { $rel = $rel + 'index.html' }

    $candidate = [IO.Path]::GetFullPath([IO.Path]::Combine($rootFull, $rel))

    # Protege contra traversal
    if (-not $candidate.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
      $res.StatusCode = 403
      $bytes = [Text.Encoding]::UTF8.GetBytes('403 Forbidden')
      $res.ContentType = 'text/plain; charset=utf-8'
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
      continue
    }

    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      $res.StatusCode = 404
      $bytes = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
      $res.ContentType = 'text/plain; charset=utf-8'
      $res.ContentLength64 = $bytes.Length
      if ($req.HttpMethod -ne 'HEAD') {
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      }
      $res.Close()
      continue
    }

    $res.StatusCode = 200
    $res.ContentType = Get-ContentType $candidate

    $fileBytes = [IO.File]::ReadAllBytes($candidate)
    $res.ContentLength64 = $fileBytes.Length
    if ($req.HttpMethod -ne 'HEAD') {
      $res.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
    }
    $res.Close()
  } catch {
    try {
      $ctx.Response.StatusCode = 500
      $bytes = [Text.Encoding]::UTF8.GetBytes('500 Internal Server Error')
      $ctx.Response.ContentType = 'text/plain; charset=utf-8'
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $ctx.Response.Close()
    } catch {}
  }
}
