#Requires -Version 5.1
param([Parameter(Mandatory=$true)][string]$Directory)
$ErrorActionPreference = 'Stop'
$folder = (Get-Item -LiteralPath $Directory -ErrorAction Stop).FullName.TrimEnd('\')
if (!(Test-Path -LiteralPath $folder -PathType Container)) { throw 'Cartella sito non disponibile.' }
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class SentinelFolderWindow {
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hwnd, int command);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
}
'@
$shell = New-Object -ComObject Shell.Application
function Find-FolderWindow {
    foreach ($window in $script:shell.Windows()) {
        try {
            if ($window.Document.Folder.Self.Path.TrimEnd('\') -ieq $script:folder) { return $window }
        } catch { }
    }
    return $null
}
$window = Find-FolderWindow
if (!$window) {
    # Open via the user's Windows shell, rather than spawning a hidden Explorer.
    $shell.Open($folder)
    for ($attempt=0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 200
        $window = Find-FolderWindow
        if ($window) { break }
    }
}
if (!$window) { throw 'Windows non ha aperto la cartella in Esplora file. Verifica che Sentinel sia avviato dal BAT nella tua sessione desktop.' }
$handle = [IntPtr]([long]$window.HWND)
# Restore hidden/minimized windows left by older Sentinel versions.
[SentinelFolderWindow]::ShowWindowAsync($handle, 5) | Out-Null
[SentinelFolderWindow]::ShowWindowAsync($handle, 9) | Out-Null
# Raise once, then immediately remove topmost status; the window is never pinned.
[SentinelFolderWindow]::SetWindowPos($handle, [IntPtr](-1), 0, 0, 0, 0, 0x43) | Out-Null
[SentinelFolderWindow]::SetWindowPos($handle, [IntPtr](-2), 0, 0, 0, 0, 0x43) | Out-Null
[SentinelFolderWindow]::SetForegroundWindow($handle) | Out-Null
Write-Output 'Cartella disponibile in Esplora file.'
