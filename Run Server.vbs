' Double-click this file to open a terminal and start the dev server (port 3001)
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
shell.Run "cmd /k cd /d """ & folder & """ && start.cmd", 1, False
