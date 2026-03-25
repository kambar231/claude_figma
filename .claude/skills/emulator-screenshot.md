# Emulator Screenshot & Comparison

## When to Use
When verifying Figma designs against the actual Flutter app running on Android emulator.

## Prerequisites
- Android emulator running (Pixel 9 or similar)
- ADB: `C:/Users/kmangibayev/AppData/Local/Android/Sdk/platform-tools/adb.exe`
- Flutter app deployed to emulator

## Take Screenshot
```bash
ADB="C:/Users/kmangibayev/AppData/Local/Android/Sdk/platform-tools/adb.exe"
"$ADB" shell 'screencap /sdcard/screen.png'
"$ADB" pull //sdcard/screen.png <output-path>
```
Note: Git Bash mangles `/sdcard/` — use quotes around the shell command and `//sdcard/` for pull.

## Extract Layout Positions
```bash
bun run scripts/extract-layout.js
```
Outputs: `experiments/layout-dump.json` with element bounds in logical pixels.
Device: 411×923 logical at 2.625x density.
Scale to iPhone 14 Pro: multiply x by 393/411, y by 852/923.

## Start Emulator
```bash
"C:/Users/kmangibayev/AppData/Local/Android/Sdk/emulator/emulator.exe" -avd Pixel_9 -no-audio -no-boot-anim &
```
Wait for boot: `adb wait-for-device`

## Launch App
```bash
cd balo/frontend/messaging_app
export JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"
flutter run -d emulator-5554
```

## Comparison Process
1. Export Figma frame: `export_node_as_image` command, save as PNG
2. Take emulator screenshot
3. View both images (Read tool can display PNGs)
4. Score element by element using rubric
5. Document differences in audit .md file

## Scoring Rubric (100 points)
| Category | Points |
|----------|--------|
| Background gradient | 15 |
| Avatar with glow | 15 |
| Header buttons (vector icons) | 10 |
| Name text | 5 |
| Date badge | 5 |
| Message + timestamp | 10 |
| Input area | 15 |
| Glass/glow effects | 15 |
| Home indicator | 5 |
| Overall feel | 5 |

## Navigate App via ADB
```bash
# Tap at coordinates
adb shell input tap <x> <y>
# Swipe
adb shell input swipe <x1> <y1> <x2> <y2> <duration_ms>
# Back button
adb shell input keyevent KEYCODE_BACK
# Type text
adb shell input text "hello"
```
