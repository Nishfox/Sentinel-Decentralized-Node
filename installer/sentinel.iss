#define AppVersion "1.0.0"
[Setup]
AppId={{13AF3FD3-5E89-4764-BC87-B2C91A1C29CE}
AppName=Sentinel Suite Community Edition
AppPublisher=Nishfox
VersionInfoCompany=Nishfox
VersionInfoCopyright=Copyright (c) 2026 Nishfox
AppVersion={#AppVersion}
DefaultDirName={localappdata}\SentinelSuite
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible arm64
OutputDir=..\dist
OutputBaseFilename=SentinelSuite-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
WizardSmallImageFile=sentinel-wizard-logo.bmp
Uninstallable=yes
DisableProgramGroupPage=yes
[Languages]
Name: "it"; MessagesFile: "compiler:Languages\Italian.isl"
Name: "fr"; MessagesFile: "compiler:Languages\French.isl"
Name: "de"; MessagesFile: "compiler:Languages\German.isl"
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "ru"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "ar"; MessagesFile: "compiler:Languages\Arabic.isl"
Name: "ta"; MessagesFile: "compiler:Languages\Tamil.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\install.ps1"; DestDir: "{tmp}\SentinelPayload"
Source: "..\uninstall.ps1"; DestDir: "{tmp}\SentinelPayload"
Source: "..\package.json"; DestDir: "{tmp}\SentinelPayload"
Source: "..\config.example.json"; DestDir: "{tmp}\SentinelPayload"
Source: "..\Avvia-Sentinel.bat"; DestDir: "{tmp}\SentinelPayload"
Source: "..\scripts\*"; DestDir: "{tmp}\SentinelPayload\scripts"; Flags: recursesubdirs
Source: "..\bin\sentinel-node.exe"; DestDir: "{tmp}\SentinelPayload\bin"
Source: "..\src\*"; DestDir: "{tmp}\SentinelPayload\src"; Flags: recursesubdirs
Source: "..\dashboard\*"; DestDir: "{tmp}\SentinelPayload\dashboard"; Flags: recursesubdirs
Source: "..\templates\*"; DestDir: "{tmp}\SentinelPayload\templates"; Flags: recursesubdirs
Source: "..\uninstall.ps1"; DestDir: "{app}"
Source: "..\Avvia-Sentinel.bat"; DestDir: "{app}"
Source: "..\scripts\*"; DestDir: "{app}\scripts"; Flags: recursesubdirs
Source: "..\src\*"; DestDir: "{app}\src"; Flags: recursesubdirs
Source: "..\dashboard\*"; DestDir: "{app}\dashboard"; Flags: recursesubdirs
Source: "..\templates\*"; DestDir: "{app}\templates"; Flags: recursesubdirs
Source: "..\bin\sentinel-node.exe"; DestDir: "{app}\bin"
Source: "..\LICENSE"; DestDir: "{app}"
Source: "..\node-agent\THIRD-PARTY-NOTICES.txt"; DestDir: "{app}"
Source: "..\README.md"; DestDir: "{app}"
Source: "..\Leggimi.md"; DestDir: "{app}"
Source: "..\THIRD-PARTY-ENG.md"; DestDir: "{app}"
Source: "..\THIRD-PARTY.md"; DestDir: "{app}"
Source: "..\docs\*"; DestDir: "{app}\docs"; Excludes: "\Download\*"; Flags: recursesubdirs
[Icons]
Name: "{autoprograms}\Sentinel Suite"; Filename: "{app}\Avvia-Sentinel.bat"
[Tasks]
Name: "localai"; Description: "AI locale (Python, Ollama e Qwen 2.5 1.5B)"; Flags: unchecked
Name: "monitoring"; Description: "Monitoraggio e sicurezza (Glances, Uptime Kuma e CrowdSec)"; Flags: unchecked
[Code]
var
  NamesPage: TInputQueryWizardPage;
  SitePage: TInputDirWizardPage;
  AdminPage: TInputQueryWizardPage;
#include "admin-channel.iss"
function ValidAdminUsername(Value: String): Boolean;
var I: Integer; C: Char;
begin
  Result := False;
  if (Length(Value) < 3) or (Length(Value) > 32) then Exit;
  for I := 1 to Length(Value) do begin
    C := Value[I];
    if not (((C >= 'a') and (C <= 'z')) or ((C >= 'A') and (C <= 'Z')) or ((C >= '0') and (C <= '9')) or (C = '.') or (C = '_') or (C = '-')) then Exit;
  end;
  Result := True;
end;
function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo,
  MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
begin
  Result := 'Configurazione' + NewLine +
    Space + 'Cartella Sentinel: ' + WizardDirValue + NewLine +
    Space + 'Cartella dei siti: ' + SitePage.Values[0] + NewLine +
    Space + 'Primo progetto: ' + NamesPage.Values[0] + NewLine +
    Space + 'Nodo Tailscale richiesto: ' + NamesPage.Values[1] + NewLine +
    Space + 'Utente amministratore: ' + AdminPage.Values[0] + NewLine + NewLine +
    'Componenti' + NewLine +
    Space + 'Dashboard, server web locale e launcher Sentinel.' + NewLine +
    Space + 'Node.js e Tailscale: riutilizzo se compatibili, installazione se necessari.' + NewLine;
  if WizardIsTaskSelected('localai') then
    Result := Result + Space + 'AI locale: Python, Ollama e Qwen 2.5 1.5B.' + NewLine
  else
    Result := Result + Space + 'AI locale: deselezionata.' + NewLine;
  if WizardIsTaskSelected('monitoring') then
    Result := Result + Space + 'Monitoraggio e sicurezza: Glances, Uptime Kuma e CrowdSec.' + NewLine
  else
    Result := Result + Space + 'Monitoraggio e sicurezza: deselezionati.' + NewLine;
  Result := Result + NewLine + 'Installazione e primo avvio' + NewLine +
    Space + 'Accedi a Tailscale se richiesto durante la configurazione.' + NewLine +
    Space + 'Apri Sentinel Suite dal menu Start e accedi con il tuo account.' + NewLine +
    Space + 'Collega il nodo e pubblica il sito dalla dashboard quando sei pronto.';
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  if FileExists(ExpandConstant('{app}\config.json')) then
    Result := 'Questa cartella contiene una installazione Sentinel. Nessun file è stato sostituito. Esporta un backup e scegli una cartella di installazione nuova.';
end;
function InitializeUninstall(): Boolean;
var Code: Integer; Params: String;
begin
  Params := '-NoProfile -ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\uninstall.ps1') + '"';
  Result := Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Params, '', SW_HIDE, ewWaitUntilTerminated, Code);
  if Result then Result := Code = 0;
  if not Result then MsgBox('Arresta Sentinel dalla dashboard prima di disinstallare. Nessun file applicazione è stato rimosso.', mbError, MB_OK);
end;
function LocalText(Italian, English: String): String;
begin
  if ActiveLanguage = 'it' then Result := Italian else Result := English;
end;

procedure InitializeWizard;
begin
  WizardForm.Caption := 'Sentinel Community Edition - Creato da Nishfox';
  NamesPage := CreateInputQueryPage(wpSelectDir, LocalText('Primo sito e nodo', 'First site and node'), LocalText('Configura il tuo primo progetto', 'Configure your first project'), LocalText('Il dominio effettivo sarà assegnato dalla tua tailnet Tailscale.', 'Tailscale assigns the final domain.'));
  NamesPage.Add('Nome del primo sito e della sua cartella:', False);
  NamesPage.Add('Nome del nodo del primo sito:', False);
  NamesPage.Values[0] := 'sentinel';
  NamesPage.Values[1] := 'guard';
  SitePage := CreateInputDirPage(NamesPage.ID, LocalText('Cartella progetti', 'Projects folder'), LocalText('Scegli dove conservare i tuoi siti', 'Choose where to store your sites'), LocalText('Ogni sito avrà una sottocartella con il suo nome. La pubblicazione si attiva dalla dashboard.', 'Each site has its own subfolder. Publish it from the dashboard.'), False, '');
  SitePage.Add('Cartella principale dei progetti:');
  SitePage.Values[0] := ExpandConstant('{userdocs}\Sentinel\Website');
  AdminPage := CreateInputQueryPage(SitePage.ID, LocalText('Account amministratore', 'Administrator account'), LocalText('Proteggi la dashboard e la gestione dei dati', 'Protect the dashboard and project data'), LocalText('Crea le credenziali per accedere a Sentinel. I siti pubblici non richiederanno questo login.', 'Create your Sentinel login.'));
  AdminPage.Add('Username amministratore:', False);
  AdminPage.Add('Password (12-128 caratteri):', True);
  AdminPage.Add('Conferma password:', True);
  AdminPage.Values[0] := 'admin';
end;
function ValidName(Value: String): Boolean;
var I: Integer;
begin
  Result := False;
  if (Length(Value) < 1) or (Length(Value) > 63) then Exit;
  if (Value[1] = '-') or (Value[Length(Value)] = '-') then Exit;
  for I := 1 to Length(Value) do
    if not (((Value[I] >= 'a') and (Value[I] <= 'z')) or ((Value[I] >= '0') and (Value[I] <= '9')) or (Value[I] = '-')) then Exit;
  Result := True;
end;
function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = NamesPage.ID then begin
    Result := ValidName(NamesPage.Values[0]) and ValidName(NamesPage.Values[1]);
    if not Result then MsgBox('Usa 1–63 lettere minuscole, numeri o trattini; nessun trattino iniziale o finale.', mbError, MB_OK);
  end;
  if CurPageID = AdminPage.ID then begin
    Result := ValidAdminUsername(AdminPage.Values[0]);
    if not Result then begin MsgBox('Username: 3-32 lettere, numeri, punto, trattino o underscore.', mbError, MB_OK); Exit; end;
    Result := (Length(AdminPage.Values[1]) >= 12) and (Length(AdminPage.Values[1]) <= 128) and (Pos(#10, AdminPage.Values[1]) = 0) and (Pos(#13, AdminPage.Values[1]) = 0);
    if not Result then begin MsgBox('Password: 12-128 caratteri, senza ritorni a capo.', mbError, MB_OK); Exit; end;
    Result := AdminPage.Values[1] = AdminPage.Values[2];
    if not Result then MsgBox('Le password non coincidono.', mbError, MB_OK);
  end;
  if CurPageID = SitePage.ID then begin
    Result := (Pos('"', SitePage.Values[0]) = 0) and (Length(SitePage.Values[0]) > 3);
    if not Result then MsgBox('Seleziona un percorso valido.', mbError, MB_OK);
  end;
end;
procedure CurStepChanged(CurStep: TSetupStep);
var Code: Integer; Params, PipeName, ResultFile: String;
begin
  if CurStep = ssPostInstall then begin
    PipeName := 'SentinelAdmin-' + Copy(GetSHA256OfString(ExpandConstant('{tmp}') + IntToStr(AdminTickCount()) + AdminPage.Values[0]), 1, 32);
    ResultFile := ExpandConstant('{tmp}\sentinel-install-result.txt');
    Params := '-NoProfile -ExecutionPolicy Bypass -File "' + ExpandConstant('{tmp}\SentinelPayload\scripts\run-wizard-install.ps1') + '" -AdminPipe "' + PipeName + '" -ResultFile "' + ResultFile + '" -ProjectName "' + NamesPage.Values[0] + '" -NodeName "' + NamesPage.Values[1] + '" -TargetDir "' + SitePage.Values[0] + '" -InstallDir "' + ExpandConstant('{app}') + '"';
    if not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Params, '', SW_SHOW, ewNoWait, Code) then RaiseException('Impossibile avviare la configurazione.');
    try
      SendAdminCredentials(PipeName, ResultFile, AdminPage.Values[0], AdminPage.Values[1]);
    finally
      AdminPage.Values[1] := '';
      AdminPage.Values[2] := '';
    end;
    Params := '-NoProfile -ExecutionPolicy Bypass -File "' + ExpandConstant('{tmp}\SentinelPayload\scripts\wait-wizard-install.ps1') + '" -ResultFile "' + ResultFile + '"';
    if not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Params, '', SW_HIDE, ewWaitUntilTerminated, Code) then RaiseException('Impossibile verificare la configurazione.');
    if Code <> 0 then RaiseException('Configurazione non completata. Verificare gli errori PowerShell e riprovare.');
    if WizardIsTaskSelected('localai') or WizardIsTaskSelected('monitoring') then begin
      Params := '-NoProfile -ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\scripts\install-wizard-extras.ps1') + '"';
      if WizardIsTaskSelected('localai') then Params := Params + ' -AI';
      if WizardIsTaskSelected('monitoring') then Params := Params + ' -Monitoring';
      if not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Params, '', SW_SHOW, ewWaitUntilTerminated, Code) or (Code <> 0) then
        MsgBox('Sentinel base installato. Configurazione degli extra incompleta. Controlla gli errori PowerShell e ripeti lo script install-wizard-extras.ps1 dalla cartella scripts.', mbInformation, MB_OK)
      else
        MsgBox('Componenti opzionali configurati. Arresta Sentinel dalla dashboard e riaprilo dal collegamento per caricarli.', mbInformation, MB_OK);
    end;
  end;
end;





