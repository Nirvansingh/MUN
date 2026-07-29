$base = 'C:\Users\nirva\Downloads\MUN'
$files = Get-ChildItem -Path $base -Recurse -File -Filter *.txt

$manifest = @()

foreach ($f in $files) {
    $rel = $f.FullName.Substring($base.Length + 1).Replace('\', '/')
    $raw = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    
    $obj = [PSCustomObject]@{
        path = $rel
        name = $f.Name
        size = $f.Length
        content = $raw
    }
    $manifest += $obj
}

$json = $manifest | ConvertTo-Json -Depth 5
$js = "window.MUN_MANIFEST = " + $json + ";"
[System.IO.File]::WriteAllText("$base\manifest.js", $js, [System.Text.Encoding]::UTF8)
Write-Output "Generated manifest.js with $($files.Count) files."
