# Emulator Screenshot & Verification

## When to Use
When verifying Figma designs against the actual Flutter app, or when needing a ground-truth reference image.

## Take Screenshot
```bash
ADB="C:/Users/kmangibayev/AppData/Local/Android/Sdk/platform-tools/adb.exe"
"$ADB" shell 'screencap /sdcard/screen.png'
"$ADB" pull //sdcard/screen.png <output-path>
```
Note: Git Bash mangles `/sdcard/` — use `'...'` quotes for shell commands and `//sdcard/` for pull.

## Verification Process
1. Build component/screen in Figma using `use_figma`
2. Get Figma screenshot: `get_screenshot` with nodeId and fileKey
3. Take emulator screenshot via ADB
4. View BOTH images and compare honestly
5. If different, identify specific issues and fix

## Crop for Comparison
Use PowerShell to crop specific regions from full screenshots:
```powershell
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('path/to/screenshot.png')
$rect = New-Object System.Drawing.Rectangle(x, y, width, height)
$bmp = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($img, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
$bmp.Save('output.png')
```

## Honesty Rules
- If fonts don't match → score 0, not "close enough"
- If glow color is wrong → score 0
- If element is missing → score 0
- Never inflate accuracy scores
- The user rates 90% self-scores as 40-50% actual

## Tools
- ADB: `C:/Users/kmangibayev/AppData/Local/Android/Sdk/platform-tools/adb.exe`
- Emulator: `C:/Users/kmangibayev/AppData/Local/Android/Sdk/emulator/emulator.exe -avd Pixel_9`
- Flutter: `C:/Users/kmangibayev/flutter/bin/flutter.bat`
- Java: `JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"`

## Launch App on Emulator
```bash
cd balo/frontend/messaging_app
export JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"
flutter run -d emulator-5554
```
