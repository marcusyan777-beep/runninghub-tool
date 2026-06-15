param(
    [Parameter(Mandatory = $true)]
    [string]$ZipPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPathFull = [System.IO.Path]::GetFullPath($ZipPath)
$outputFull = [System.IO.Path]::GetFullPath($OutputDirectory)
$allowedExtensions = @(".mp4", ".webm", ".mov", ".png", ".jpg", ".jpeg", ".webp", ".gif")
$maximumExtractedBytes = 2GB
$totalBytes = 0L

$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPathFull)
try {
    foreach ($entry in $archive.Entries) {
        if ([string]::IsNullOrWhiteSpace($entry.Name)) {
            continue
        }

        $extension = [System.IO.Path]::GetExtension($entry.Name).ToLowerInvariant()
        if ($allowedExtensions -notcontains $extension) {
            continue
        }

        $totalBytes += $entry.Length
        if ($totalBytes -gt $maximumExtractedBytes) {
            throw "Extracted media exceeds 2 GB"
        }

        $fileName = [System.IO.Path]::GetFileName($entry.Name) -replace '[<>:"/\\|?*]', "_"
        $destination = [System.IO.Path]::GetFullPath(
            [System.IO.Path]::Combine($outputFull, $fileName)
        )

        if (-not $destination.StartsWith($outputFull, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Unsafe ZIP entry"
        }

        [System.IO.Compression.ZipFileExtensions]::ExtractToFile(
            $entry,
            $destination,
            $true
        )
    }
}
finally {
    $archive.Dispose()
}
