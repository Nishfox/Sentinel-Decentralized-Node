[Setup]
AppName=Sentinel credential transport test
AppVersion=1.0
CreateAppDir=no
Uninstallable=no
PrivilegesRequired=lowest
OutputDir=..\..\runtime\wizard-transport-test
OutputBaseFilename=admin-pipe-test
DisableStartupPrompt=yes
[Code]
#include "..\..\installer\admin-channel.iss"
function InitializeSetup(): Boolean;
var Root, PipeName, Params, Account: String; Code, I: Integer;
begin
  Result := False;
  Root := '{#TestRoot}\runtime\wizard-transport-test\account-{#TestId}';
  ForceDirectories(Root);
  PipeName := 'SentinelAdmin-' + Copy(GetSHA256OfString(Root + IntToStr(AdminTickCount())), 1, 32);
  Params := '-NoProfile -ExecutionPolicy Bypass -File "{#TestRoot}\test\fixtures\provision-admin-pipe.ps1" -PipeName "' + PipeName + '" -InstallDir "' + Root + '" -SourceRoot "{#TestRoot}" -Node "{#NodePath}"';
  if not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Params, '', SW_HIDE, ewNoWait, Code) then begin SaveStringToFile(Root + '\result.txt', 'launch failed: ' + IntToStr(Code) + ' ' + SysErrorMessage(Code), False); Exit; end;
  try
    SendAdminCredentials(PipeName, Root + '\result.txt', 'wizard-test', 'Test-only-Àß-Sentinel-22!');
    Account := Root + '\runtime\auth\account.json';
    for I := 1 to 200 do begin
      if FileExists(Account) then Break;
      Sleep(100);
    end;
    if FileExists(Account) then SaveStringToFile(Root + '\result.txt', 'ok', False)
    else SaveStringToFile(Root + '\result.txt', 'account not created', False);
  except
    SaveStringToFile(Root + '\result.txt', 'transport failed: ' + GetExceptionMessage, False);
  end;
end;
