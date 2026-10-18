
# Keimwerk: lokaler statischer Testserver. Nur localhost:8000.
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')
$prefix = 'http://localhost:8000/'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
    $listener.Start()
} catch {
    Write-Host 'Port 8000 ist bereits belegt oder der Zugriff wurde verweigert.' -ForegroundColor Red
    Write-Host 'Eventuell laeuft bereits ein anderer lokaler Server auf Port 8000.'
    throw
}
Write-Host ''
Write-Host 'KEIMWERK V2.4 - Suche, Wissensverknuepfung und Datensicherung' -ForegroundColor Green
Write-Host ('Ordner: ' + $root)
Write-Host ('Adresse: ' + $prefix)
Write-Host 'Mit Strg+C beenden.'
Start-Process $prefix
$mime = @{
    '.html' = 'text/html; charset=utf-8'; '.css'='text/css; charset=utf-8';
    '.js'='application/javascript; charset=utf-8'; '.json'='application/json; charset=utf-8';
    '.webp'='image/webp'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg';
    '.svg'='image/svg+xml'; '.txt'='text/plain; charset=utf-8'; '.ico'='image/x-icon'
}
try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $response = $ctx.Response
        $response.Headers['Cache-Control']='no-store, max-age=0'
        $response.Headers['Pragma']='no-cache'
        try {
            $relative = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
            $relative = $relative.Replace('/', '\')
            $file = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
            if (-not $file.StartsWith($root + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
                $response.StatusCode=403
            } elseif (-not [System.IO.File]::Exists($file)) {
                $response.StatusCode=404
            } else {
                $ext=[System.IO.Path]::GetExtension($file).ToLowerInvariant()
                if($mime.ContainsKey($ext)) {$response.ContentType=$mime[$ext]}
                else {$response.ContentType='application/octet-stream'}
                $bytes=[System.IO.File]::ReadAllBytes($file)
                $response.ContentLength64=$bytes.LongLength
                $response.OutputStream.Write($bytes,0,$bytes.Length)
            }
        } catch {
            try {$response.StatusCode=500} catch {}
        } finally {
            try {$response.OutputStream.Close()} catch {}
            try {$response.Close()} catch {}
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
