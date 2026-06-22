; TRAE Orbit Windows 安装脚本
; 直接调用 makensis.exe 编译，绕过 Tauri bundler
; 产物：src-tauri\target\release\bundle\nsis\trae-orbit-Setup.exe

!define APP_NAME "TRAE Orbit"
!define APP_PUBLISHER "TRAE"
!define APP_VERSION "0.1.0"
!define APP_EXE "app.exe"
!define APP_ID "com.trae.orbit"

; 现代化 UI
Unicode True
ManifestDPIAware True

Name "${APP_NAME}"
OutFile "src-tauri\target\release\bundle\nsis\trae-orbit-Setup.exe"
InstallDir "$LOCALAPPDATA\${APP_NAME}"
InstallDirRegKey HKCU "Software\${APP_PUBLISHER}\${APP_NAME}" "InstallDir"
RequestExecutionLevel user
ShowInstDetails show
ShowUnInstDetails show

; 安装包图标
Icon "src-tauri\icons\icon.ico"
UninstallIcon "src-tauri\icons\icon.ico"

; 包含现代 UI 宏
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

; MUI 设置
!define MUI_ABORTWARNING
!define MUI_ICON "src-tauri\icons\icon.ico"
!define MUI_UNICON "src-tauri\icons\icon.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "启动 ${APP_NAME}"

; 安装页面
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; 卸载页面
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; 语言
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

; ==================== 安装段 ====================
Section "Install" SecInstall
  SectionIn RO

  ; 创建安装目录
  SetOutPath "$INSTDIR"

  ; 写入主程序（app.exe 必须与 server.mjs 同目录，因为 resource_dir() 返回 exe 父目录）
  File "src-tauri\target\release\app.exe"

  ; 写入后端服务（server.mjs 作为 resource）
  File "dist-server\server.mjs"

  ; 写入前端静态资源（dist 目录，server.mjs 通过同目录 dist 提供前端页面）
  SetOutPath "$INSTDIR\dist"
  File /r "dist\*.*"
  SetOutPath "$INSTDIR"

  ; 写入图标
  File "src-tauri\icons\icon.ico"

  ; 写入注册表项（用于卸载和安装目录记忆）
  WriteRegStr HKCU "Software\${APP_PUBLISHER}\${APP_NAME}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\${APP_PUBLISHER}\${APP_NAME}" "Version" "${APP_VERSION}"

  ; 添加卸载信息到控制面板
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "DisplayIcon" "$\"$INSTDIR\icon.ico$\""
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "NoRepair" 1

  ; 估算占用空间（字节）
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "EstimatedSize" "$0"

  ; 创建卸载程序
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; 创建开始菜单快捷方式
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\icon.ico"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\卸载 ${APP_NAME}.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\icon.ico"

  ; 创建桌面快捷方式
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\icon.ico"
SectionEnd

; ==================== 卸载段 ====================
Section "Uninstall"
  ; 终止运行中的 app.exe（如果存在）
  nsExec::ExecToLog 'taskkill /F /IM "${APP_EXE}" /T'
  Pop $0

  ; 删除程序文件
  Delete "$INSTDIR\${APP_EXE}"
  Delete "$INSTDIR\server.mjs"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\uninstall.exe"

  ; 删除前端静态资源目录
  RMDir /r "$INSTDIR\dist"

  ; 删除数据目录（便携模式产生的 node.json、orbit.db 等）
  RMDir /r "$INSTDIR\data"

  ; 删除快捷方式
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\卸载 ${APP_NAME}.lnk"
  Delete "$DESKTOP\${APP_NAME}.lnk"
  RMDir "$SMPROGRAMS\${APP_NAME}"

  ; 删除注册表项
  DeleteRegKey HKCU "Software\${APP_PUBLISHER}\${APP_NAME}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}"

  ; 删除安装目录（如果为空）
  RMDir "$INSTDIR"
SectionEnd
