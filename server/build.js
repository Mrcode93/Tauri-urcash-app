const pkg = require('pkg');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function buildServer() {
  // Check if required files exist
  const requiredFiles = ['index.js', 'package.json'];
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ Required file missing: ${file}`);
      process.exit(1);
    }
  }

  // Detect current platform and architecture
  const platform = os.platform();
  const arch = os.arch();
  
  // Define targets based on current platform
  let targets = [];
  let outputMap = {};
  
  if (platform === 'win32') {
    targets = ['node18-win-x64'];
    outputMap = {
      'node18-win-x64': 'server-win.exe'
    };
  } else if (platform === 'darwin') {
    if (arch === 'arm64') {
      targets = ['node18-macos-arm64'];
      outputMap = {
        'node18-macos-arm64': 'server-mac-arm64'
      };
    } else {
      targets = ['node18-macos-x64'];
      outputMap = {
        'node18-macos-x64': 'server-mac-x64'
      };
    }
  } else if (platform === 'linux') {
    targets = ['node18-linux-x64'];
    outputMap = {
      'node18-linux-x64': 'server-linux'
    };
  }

  // For cross-platform builds, you can uncomment these lines:
  // targets = ['node18-win-x64', 'node18-macos-arm64', 'node18-macos-x64', 'node18-linux-x64'];
  // outputMap = {
  //   'node18-win-x64': 'server-win.exe',
  //   'node18-macos-arm64': 'server-mac-arm64',
  //   'node18-macos-x64': 'server-mac-x64',
  //   'node18-linux-x64': 'server-linux'
  // };

  try {
    for (const target of targets) {
      
      
      await pkg.exec([
        'index.js',
        '--target', target,
        '--output', outputMap[target],
        '--compress', 'GZip'
      ]);
      
      // Verify the executable was created
      if (fs.existsSync(outputMap[target])) {
        const stats = fs.statSync(outputMap[target]);
        
      } else {
        console.error(`❌ Failed to create ${outputMap[target]}`);
        process.exit(1);
      }
    }
    
    
  } catch (error) {
    console.error('❌ Error building server:', error);
    process.exit(1);
  }
}
//  npx update-browserslist-db@latest

buildServer();