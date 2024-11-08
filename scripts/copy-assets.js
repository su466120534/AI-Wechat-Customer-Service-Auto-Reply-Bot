const fs = require('fs-extra');
const path = require('path');

async function copyAssets() {
  const assets = [
    // 生产环境资源
    { from: 'src/renderer/index.html', to: 'dist/index.html' },
    { from: 'src/renderer/styles/index.css', to: 'dist/styles/index.css' },
    { from: 'src/renderer/js/error-handler.js', to: 'dist/js/error-handler.js' },
    { from: 'dist/renderer.bundle.js', to: 'dist/renderer.bundle.js' },
    
    // 开发环境资源
    { from: 'src/renderer/index.html', to: 'index.html' },
    { from: 'src/renderer/styles/index.css', to: 'styles/index.css' },
    { from: 'src/renderer/js/error-handler.js', to: 'dist/js/error-handler.js' },
    { from: 'dist/renderer.bundle.js', to: 'renderer.bundle.js' }
  ];

  for (const asset of assets) {
    try {
      await fs.ensureDir(path.dirname(path.join(__dirname, '..', asset.to)));
      const sourcePath = path.join(__dirname, '..', asset.from);
      const targetPath = path.join(__dirname, '..', asset.to);
      
      if (sourcePath !== targetPath && fs.existsSync(sourcePath)) {
        await fs.copy(sourcePath, targetPath);
        console.log(`✓ Copied ${asset.from} to ${asset.to}`);
      } else if (sourcePath === targetPath) {
        console.log(`- Skipped ${asset.from} (same as target)`);
      } else {
        console.warn(`! Source file not found: ${asset.from}`);
      }
    } catch (error) {
      console.error(`✗ Failed to copy ${asset.from}:`, error);
    }
  }
}

copyAssets().catch(console.error);