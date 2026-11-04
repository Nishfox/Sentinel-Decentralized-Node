#Requires -Version 5.1
$ErrorActionPreference='Stop'
$confirmed=@()
$candidates=@()
$errorsFound=@()
try { $confirmed=@(Get-VpnConnection -ErrorAction Stop | Where-Object ConnectionStatus -eq 'Connected' | Select-Object -ExpandProperty Name) } catch { $errorsFound+='Rilevamento VPN Windows non disponibile' }
try { $confirmed+=@(Get-VpnConnection -AllUserConnection -ErrorAction Stop | Where-Object ConnectionStatus -eq 'Connected' | Select-Object -ExpandProperty Name) } catch { }
try { $candidates=@(Get-NetAdapter -ErrorAction Stop | Where-Object { $_.Status -eq 'Up' -and $_.InterfaceDescription -match 'WireGuard|OpenVPN|TAP-|Wintun|NordVPN|Proton|Mullvad|ExpressVPN|Surfshark' -and $_.InterfaceDescription -notmatch 'Tailscale' } | Select-Object -ExpandProperty InterfaceDescription) } catch { $errorsFound+='Rilevamento adattatori non disponibile' }
$profiles=@()
try { $profiles=@(Get-NetFirewallProfile -ErrorAction Stop | Select-Object Name,@{n='enabled';e={[bool]$_.Enabled}}) } catch { $errorsFound+='Stato Windows Firewall non disponibile' }
$vpnState=if($confirmed.Count){'connected'}elseif($candidates.Count){'possible'}elseif($errorsFound.Count){'unknown'}else{'not-detected'}
@{vpn=@{state=$vpnState;names=@($confirmed+$candidates|Select-Object -Unique);nodeRouting='unknown'};windowsFirewall=@{profiles=$profiles;known=($profiles.Count -gt 0)};errors=$errorsFound;checkedAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json -Depth 5 -Compress
