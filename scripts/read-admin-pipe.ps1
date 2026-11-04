#Requires -Version 5.1
function Read-SentinelAdminPipe([string]$PipeName) {
    if ($PipeName -notmatch '^SentinelAdmin-[a-f0-9]{32}$') { throw 'Canale credenziali non valido.' }
    $acl = New-Object System.IO.Pipes.PipeSecurity
    $user = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $system = New-Object Security.Principal.SecurityIdentifier('S-1-5-18')
    foreach ($sid in @($user,$system)) {
        $rule = New-Object System.IO.Pipes.PipeAccessRule($sid,[IO.Pipes.PipeAccessRights]::FullControl,[Security.AccessControl.AccessControlType]::Allow)
        $acl.AddAccessRule($rule)
    }
    $acl.SetAccessRuleProtection($true,$false)
    $pipe = New-Object IO.Pipes.NamedPipeServerStream($PipeName,[IO.Pipes.PipeDirection]::In,1,[IO.Pipes.PipeTransmissionMode]::Byte,[IO.Pipes.PipeOptions]::Asynchronous,4096,4096,$acl)
    $reader = $null
    try {
        $connection = $pipe.WaitForConnectionAsync()
        if (!$connection.Wait(60000)) { throw 'Tempo scaduto per il trasferimento delle credenziali.' }
        $reader = New-Object IO.StreamReader($pipe,[Text.Encoding]::Unicode,$false,1024,$true)
        $read = $reader.ReadToEndAsync()
        if (!$read.Wait(10000)) { throw 'Trasferimento credenziali non completato.' }
        $payload = $read.Result
        if ($payload.Length -gt 512) { throw 'Credenziali non valide.' }
        $fields = $payload.Split(@([char]10),2)
        if ($fields.Count -ne 2 -or $fields[0] -notmatch '^[a-zA-Z0-9._-]{3,32}$' -or $fields[1].Length -lt 12 -or $fields[1].Length -gt 128) { throw 'Credenziali non valide.' }
        $secret=New-Object Security.SecureString
        foreach($character in $fields[1].ToCharArray()){$secret.AppendChar($character)}
        $secret.MakeReadOnly()
        return @{Username=$fields[0];Password=$secret}
    } finally {
        $payload=$null;$fields=$null
        if ($reader) { $reader.Dispose() }
        $pipe.Dispose()
    }
}
