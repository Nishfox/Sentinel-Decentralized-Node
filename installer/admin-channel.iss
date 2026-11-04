function AdminTickCount(): LongWord;
  external 'GetTickCount@kernel32.dll stdcall';
function AdminCreateFile(Name: String; Access, Share, Security, Creation, Flags, Template: LongWord): THandle;
  external 'CreateFileW@kernel32.dll stdcall';
function AdminWriteFile(Handle: THandle; Buffer: String; Count: LongWord; var Written: LongWord; Overlapped: LongWord): Boolean;
  external 'WriteFile@kernel32.dll stdcall';
function AdminCloseHandle(Handle: THandle): Boolean;
  external 'CloseHandle@kernel32.dll stdcall';
procedure SendAdminCredentials(PipeName, ResultFile, Username, Password: String);
var I: Integer; Handle: THandle; Written: LongWord; Payload: String;
begin
  Handle := -1;
  for I := 1 to 300 do begin
    Handle := AdminCreateFile('\\.\pipe\' + PipeName, $40000000, 0, 0, 3, $00100000, 0);
    if Handle <> -1 then Break;
    if FileExists(ResultFile) then Break;
    Sleep(100);
  end;
  if Handle = -1 then RaiseException('Trasferimento protetto delle credenziali non disponibile.');
  try
    Payload := Username + #10 + Password;
    if not AdminWriteFile(Handle, Payload, Length(Payload) * 2, Written, 0) then RaiseException('Trasferimento credenziali non completato.');
    if Written <> Length(Payload) * 2 then RaiseException('Trasferimento credenziali incompleto.');
  finally
    AdminCloseHandle(Handle);
    Payload := '';
  end;
end;
