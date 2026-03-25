/**
 * ADB-based layout extractor for the running Belo app on Android emulator.
 *
 * Captures:
 *  - UI hierarchy via uiautomator dump
 *  - Screen dimensions & density
 *  - Screenshot
 *  - Flutter activity dump (best-effort)
 *
 * Outputs: experiments/layout-dump.json + experiments/emulator-layout.png
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, join } from "path";

const ADB =
  "C:/Users/kmangibayev/AppData/Local/Android/Sdk/platform-tools/adb.exe";
const ROOT = resolve(import.meta.dirname, "..");
const OUT_DIR = join(ROOT, "experiments");

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function adb(args, opts = {}) {
  const cmd = `"${ADB}" ${args}`;
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
      cwd: OUT_DIR,
      ...opts,
    }).trim();
  } catch (err) {
    console.error(`[adb] command failed: ${cmd}`);
    console.error(err.stderr || err.message);
    return null;
  }
}

function adbBinary(args) {
  const cmd = `"${ADB}" ${args}`;
  try {
    return execSync(cmd, {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
      cwd: OUT_DIR,
    });
  } catch (err) {
    console.error(`[adb] binary command failed: ${cmd}`);
    console.error(err.stderr || err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. Get device info
// ---------------------------------------------------------------------------

console.log("[1/6] Fetching device info...");

const sizeOutput = adb("shell wm size");
const densityOutput = adb("shell wm density");

let physicalWidth = 0;
let physicalHeight = 0;
let density = 1;

if (sizeOutput) {
  // "Physical size: 1080x2400"  or  "Override size: ..."
  const match = sizeOutput.match(/(\d+)x(\d+)/);
  if (match) {
    physicalWidth = parseInt(match[1], 10);
    physicalHeight = parseInt(match[2], 10);
  }
}
if (densityOutput) {
  const match = densityOutput.match(/(\d+)/);
  if (match) {
    density = parseInt(match[1], 10) / 160; // dpi -> density ratio
  }
}

const logicalWidth = Math.round(physicalWidth / density);
const logicalHeight = Math.round(physicalHeight / density);

console.log(
  `   Physical: ${physicalWidth}x${physicalHeight}, density ratio: ${density}, logical: ${logicalWidth}x${logicalHeight}`
);

// ---------------------------------------------------------------------------
// 2. Take screenshot
// ---------------------------------------------------------------------------

console.log("[2/6] Taking screenshot...");

adb("shell screencap -p //sdcard/screen.png");
adb("pull //sdcard/screen.png emulator-layout.png");

const screenshotPath = join(OUT_DIR, "emulator-layout.png");
const screenshotExists = existsSync(screenshotPath);
console.log(
  `   Screenshot saved: ${screenshotExists ? screenshotPath : "FAILED"}`
);

// ---------------------------------------------------------------------------
// 3. Dump UI hierarchy
// ---------------------------------------------------------------------------

console.log("[3/6] Dumping UI hierarchy via uiautomator...");

adb("shell uiautomator dump //sdcard/ui.xml");
adb("pull //sdcard/ui.xml ui-dump.xml");

const xmlPath = join(OUT_DIR, "ui-dump.xml");
let xmlContent = "";
if (existsSync(xmlPath)) {
  xmlContent = readFileSync(xmlPath, "utf-8");
  console.log(`   XML dump size: ${xmlContent.length} bytes`);
} else {
  console.error("   ERROR: ui-dump.xml not found");
}

// ---------------------------------------------------------------------------
// 4. Parse XML elements
// ---------------------------------------------------------------------------

console.log("[4/6] Parsing UI elements...");

function parseBounds(boundsStr) {
  // "[left,top][right,bottom]"
  const match = boundsStr.match(
    /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/
  );
  if (!match) return null;
  const left = parseInt(match[1], 10);
  const top = parseInt(match[2], 10);
  const right = parseInt(match[3], 10);
  const bottom = parseInt(match[4], 10);
  return {
    x: Math.round(left / density),
    y: Math.round(top / density),
    width: Math.round((right - left) / density),
    height: Math.round((bottom - top) / density),
    raw: { left, top, right, bottom },
  };
}

function extractAttribute(nodeStr, attr) {
  const regex = new RegExp(`${attr}="([^"]*)"`, "i");
  const match = nodeStr.match(regex);
  return match ? match[1] : "";
}

const elements = [];

// Match self-closing <node ... /> tags
const nodeRegex = /<node\s[^>]*?\/?>/g;
let nodeMatch;
while ((nodeMatch = nodeRegex.exec(xmlContent)) !== null) {
  const nodeStr = nodeMatch[0];

  const boundsStr = extractAttribute(nodeStr, "bounds");
  const bounds = boundsStr ? parseBounds(boundsStr) : null;

  const resourceId = extractAttribute(nodeStr, "resource-id");
  const className = extractAttribute(nodeStr, "class");
  const text = extractAttribute(nodeStr, "text");
  const contentDesc = extractAttribute(nodeStr, "content-desc");
  const packageName = extractAttribute(nodeStr, "package");
  const clickable = extractAttribute(nodeStr, "clickable") === "true";
  const enabled = extractAttribute(nodeStr, "enabled") === "true";
  const focused = extractAttribute(nodeStr, "focused") === "true";
  const scrollable = extractAttribute(nodeStr, "scrollable") === "true";

  if (bounds) {
    elements.push({
      id: resourceId || undefined,
      type: className,
      text: text || undefined,
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      boundsRaw: bounds.raw,
      description: contentDesc || undefined,
      package: packageName || undefined,
      clickable,
      enabled,
      focused,
      scrollable,
    });
  }
}

console.log(`   Found ${elements.length} UI elements`);

// Detect Flutter limitation: if there's essentially 1 large SurfaceView
const flutterLimited =
  elements.length < 5 &&
  elements.some((e) => e.type?.includes("SurfaceView"));

if (flutterLimited) {
  console.log(
    "   WARNING: Flutter renders in a single SurfaceView. UI hierarchy is minimal."
  );
  console.log(
    "   Will attempt alternative approaches for Flutter widget info."
  );
}

// ---------------------------------------------------------------------------
// 5. Flutter activity dump (best-effort)
// ---------------------------------------------------------------------------

console.log("[5/6] Attempting Flutter activity dump...");

const activityDump = adb("shell dumpsys activity top");
let flutterInfo = null;

if (activityDump) {
  // Save full dump for reference
  const activityDumpPath = join(OUT_DIR, "activity-dump.txt");
  writeFileSync(activityDumpPath, activityDump);
  console.log(`   Activity dump saved: ${activityDumpPath} (${activityDump.length} bytes)`);

  // Try to extract Flutter-specific info
  const flutterLines = activityDump
    .split("\n")
    .filter(
      (line) =>
        line.includes("Flutter") ||
        line.includes("io.flutter") ||
        line.includes("dart") ||
        line.includes("observatory") ||
        line.includes("vm-service")
    );

  if (flutterLines.length > 0) {
    flutterInfo = {
      relevantLines: flutterLines.slice(0, 50),
    };
    console.log(`   Found ${flutterLines.length} Flutter-related lines`);
  }

  // Try to find observatory/vm-service URL
  const observatoryMatch = activityDump.match(
    /(?:observatory|vm-service).*?(https?:\/\/\S+)/i
  );
  if (observatoryMatch) {
    flutterInfo = { ...flutterInfo, observatoryUrl: observatoryMatch[1] };
    console.log(`   Observatory URL: ${observatoryMatch[1]}`);
  }
}

// Also try to get Flutter VM service URL from logcat
console.log("   Checking logcat for Flutter VM service URL...");
const logcatOutput = adb(
  "logcat -d -t 200 -s flutter,Flutter,DartVM,observatory"
);
let vmServiceUrl = null;

if (logcatOutput) {
  const vmMatch = logcatOutput.match(
    /(?:observatory|vm.?service|dart.?vm).*?(https?:\/\/127\.0\.0\.1:\d+\/\S*)/i
  );
  if (vmMatch) {
    vmServiceUrl = vmMatch[1];
    console.log(`   VM Service URL from logcat: ${vmServiceUrl}`);
  }

  // Also look for the common Flutter log format
  const flutterVmMatch = logcatOutput.match(
    /serving.*?(https?:\/\/127\.0\.0\.1:\d+\/\S*)/i
  );
  if (!vmServiceUrl && flutterVmMatch) {
    vmServiceUrl = flutterVmMatch[1];
    console.log(`   VM Service URL from logcat: ${vmServiceUrl}`);
  }
}

// Also check the wider logcat for observatory URL
if (!vmServiceUrl) {
  const wideLogcat = adb("logcat -d -t 500");
  if (wideLogcat) {
    const vmMatch = wideLogcat.match(
      /(?:Dart VM service|Observatory).*?(https?:\/\/127\.0\.0\.1:\d+\/\S*)/i
    );
    if (vmMatch) {
      vmServiceUrl = vmMatch[1];
      console.log(`   VM Service URL from wide logcat: ${vmServiceUrl}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Build and write output JSON
// ---------------------------------------------------------------------------

console.log("[6/6] Writing output...");

const output = {
  device: {
    physicalWidth,
    physicalHeight,
    logicalWidth,
    logicalHeight,
    width: logicalWidth,
    height: logicalHeight,
    density: Math.round(density * 100) / 100,
    densityDpi: Math.round(density * 160),
  },
  screenshot: "experiments/emulator-layout.png",
  capturedAt: new Date().toISOString(),
  elementCount: elements.length,
  flutterLimited,
  flutterInfo: flutterInfo || undefined,
  vmServiceUrl: vmServiceUrl || undefined,
  elements,
};

const outputPath = join(OUT_DIR, "layout-dump.json");
writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`   Output written to: ${outputPath}`);

// Summary
console.log("\n--- Summary ---");
console.log(`Device: ${logicalWidth}x${logicalHeight} @ ${density}x density`);
console.log(`Elements found: ${elements.length}`);
console.log(`Flutter limited (single SurfaceView): ${flutterLimited}`);
console.log(`Screenshot: ${screenshotExists ? "OK" : "MISSING"}`);
console.log(`Output: ${outputPath}`);

if (flutterLimited) {
  console.log("\n--- Flutter Workaround Notes ---");
  console.log(
    "Since Flutter renders in a single SurfaceView, uiautomator cannot see individual widgets."
  );
  console.log("Alternative approaches:");
  console.log(
    "  1. Use Flutter DevTools protocol via the Dart VM service URL (if found above)"
  );
  console.log(
    "  2. Enable Flutter's semantics tree: `flutter run --enable-software-rendering`"
  );
  console.log(
    "  3. Use `flutter attach` and call `debugDumpRenderTree()` or `debugDumpSemanticsTree()`"
  );
  console.log(
    "  4. Set `Semantics` widgets in Flutter code to expose accessibility tree to uiautomator"
  );
  if (vmServiceUrl) {
    console.log(`\n  VM Service URL found: ${vmServiceUrl}`);
    console.log(
      "  You can connect Flutter DevTools or use the protocol to inspect the widget tree."
    );
  }
}
