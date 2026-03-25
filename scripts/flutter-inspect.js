#!/usr/bin/env node
/**
 * Flutter Inspector — connects to a running Flutter app via Dart VM Service
 * and dumps the widget tree with visual properties to JSON.
 *
 * Usage:
 *   node scripts/flutter-inspect.js [observatory-url]
 *
 * If no URL is provided, it attempts to find it from ADB logcat.
 *
 * Output: experiments/widget-tree.json
 */

const { execSync } = require('child_process');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'experiments', 'widget-tree.json');

async function main() {
  let vmServiceUrl = process.argv[2];

  if (!vmServiceUrl) {
    console.log('No VM service URL provided. Attempting to find from ADB...');
    vmServiceUrl = findVmServiceUrl();
  }

  if (!vmServiceUrl) {
    console.error('ERROR: Could not find Dart VM service URL.');
    console.error('');
    console.error('Options:');
    console.error('  1. Pass the URL directly:');
    console.error('     node scripts/flutter-inspect.js ws://127.0.0.1:XXXXX/ws');
    console.error('');
    console.error('  2. Make sure a Flutter app is running on a connected device/emulator');
    console.error('     and check the console output for the Observatory URL.');
    console.error('');
    console.error('  3. Run: flutter run --observatory-port=8888');
    console.error('     Then: node scripts/flutter-inspect.js ws://127.0.0.1:8888/ws');
    process.exit(1);
  }

  // Normalize URL to WebSocket format
  if (vmServiceUrl.startsWith('http://')) {
    vmServiceUrl = vmServiceUrl.replace('http://', 'ws://');
  }
  if (vmServiceUrl.startsWith('https://')) {
    vmServiceUrl = vmServiceUrl.replace('https://', 'wss://');
  }
  if (!vmServiceUrl.endsWith('/ws')) {
    vmServiceUrl = vmServiceUrl.replace(/\/$/, '') + '/ws';
  }

  console.log(`Connecting to VM service at: ${vmServiceUrl}`);

  try {
    const result = await inspectFlutterApp(vmServiceUrl);
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
    console.log(`Widget tree saved to: ${OUTPUT_PATH}`);
    console.log(`Total nodes: ${countNodes(result.tree || [])}`);
  } catch (err) {
    console.error('Failed to inspect Flutter app:', err.message);
    process.exit(1);
  }
}

function findVmServiceUrl() {
  try {
    // Try ADB logcat for the observatory/VM service URL
    const logcat = execSync(
      'adb logcat -d -t 200 2>/dev/null',
      { encoding: 'utf-8', timeout: 5000 },
    );

    // Look for patterns like:
    // "The Dart VM service is listening on http://127.0.0.1:XXXXX/YYYYY/"
    // "Observatory listening on http://127.0.0.1:XXXXX/"
    const patterns = [
      /Dart VM service is listening on (http:\/\/127\.0\.0\.1:\d+\/[^\s]+)/,
      /Observatory listening on (http:\/\/127\.0\.0\.1:\d+\/[^\s]+)/,
      /vm-service:\/\/(127\.0\.0\.1:\d+\/[^\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = logcat.match(pattern);
      if (match) {
        let url = match[1];
        if (!url.startsWith('http')) url = 'http://' + url;
        return url;
      }
    }

    // Try forwarded port
    const forwarded = execSync(
      'adb forward --list 2>/dev/null',
      { encoding: 'utf-8', timeout: 3000 },
    );
    const fwdMatch = forwarded.match(/tcp:(\d+)\s+tcp:\d+/);
    if (fwdMatch) {
      return `http://127.0.0.1:${fwdMatch[1]}/`;
    }
  } catch (_) {
    // ADB not available or failed
  }

  return null;
}

async function inspectFlutterApp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let requestId = 1;
    const pending = new Map();
    let isolateId = null;

    const send = (method, params = {}) => {
      const id = String(requestId++);
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
        setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            rej(new Error(`Timeout waiting for ${method}`));
          }
        }, 15000);
      });
    };

    ws.on('error', (err) => reject(err));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.id && pending.has(msg.id)) {
          const { resolve: res, reject: rej } = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) {
            rej(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            res(msg.result);
          }
        }
      } catch (_) {}
    });

    ws.on('open', async () => {
      try {
        // Get VM info
        const vm = await send('getVM');
        console.log(`Connected to Dart VM (version: ${vm.version || 'unknown'})`);

        // Find the main isolate
        const isolates = vm.isolates || [];
        if (isolates.length === 0) {
          throw new Error('No isolates found');
        }
        isolateId = isolates[0].id;
        console.log(`Using isolate: ${isolateId}`);

        // Try Flutter-specific extension methods
        let tree = null;

        // Method 1: ext.flutter.inspector.getRenderTree
        try {
          const renderTree = await send('ext.flutter.inspector.getRenderTree', {
            isolateId,
          });
          tree = renderTree;
          console.log('Got render tree via ext.flutter.inspector.getRenderTree');
        } catch (err) {
          console.log(`getRenderTree failed: ${err.message}`);
        }

        // Method 2: ext.flutter.inspector.getDetailsSubtree
        if (!tree) {
          try {
            // First get the root widget
            const rootWidget = await send('ext.flutter.inspector.getRootWidgetSummaryTree', {
              isolateId,
            });

            if (rootWidget && rootWidget.result) {
              tree = rootWidget.result;
              console.log('Got widget tree via getRootWidgetSummaryTree');

              // Try to get detailed subtree
              if (tree.valueId) {
                try {
                  const details = await send('ext.flutter.inspector.getDetailsSubtree', {
                    isolateId,
                    arg: tree.valueId,
                    subtreeDepth: 50,
                  });
                  if (details && details.result) {
                    tree = details.result;
                    console.log('Got detailed subtree');
                  }
                } catch (_) {}
              }
            }
          } catch (err) {
            console.log(`getRootWidgetSummaryTree failed: ${err.message}`);
          }
        }

        // Method 3: ext.flutter.debugDumpRenderTree
        if (!tree) {
          try {
            const dump = await send('ext.flutter.debugDumpRenderTree', {
              isolateId,
            });
            tree = { type: 'textDump', data: dump };
            console.log('Got text dump via debugDumpRenderTree');
          } catch (err) {
            console.log(`debugDumpRenderTree failed: ${err.message}`);
          }
        }

        // Method 4: ext.flutter.debugDumpApp (widget tree as text)
        if (!tree) {
          try {
            const dump = await send('ext.flutter.debugDumpApp', {
              isolateId,
            });
            tree = { type: 'textDump', data: dump };
            console.log('Got text dump via debugDumpApp');
          } catch (err) {
            console.log(`debugDumpApp failed: ${err.message}`);
          }
        }

        ws.close();

        resolve({
          generatedAt: new Date().toISOString(),
          description: 'Widget tree from running Flutter app via VM service',
          vmServiceUrl: wsUrl,
          tree: tree,
        });
      } catch (err) {
        ws.close();
        reject(err);
      }
    });
  });
}

function countNodes(obj) {
  if (!obj) return 0;
  if (Array.isArray(obj)) {
    return obj.reduce((sum, item) => sum + countNodes(item), 0);
  }
  if (typeof obj === 'object') {
    let count = 1;
    if (obj.children) count += countNodes(obj.children);
    return count;
  }
  return 1;
}

main();
