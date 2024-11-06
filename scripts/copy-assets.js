const fs = require('fs-extra');
const path = require('path');

async function copyAssets() {
  const assets = [
    // 生产环境资源
    { from: 'src/index.html', to: 'dist/index.html' },
    { from: 'src/styles.css', to: 'dist/styles.css' },
    { from: 'src/js/error-handler.js', to: 'dist/js/error-handler.js' },
    { from: 'dist/renderer.bundle.js', to: 'dist/renderer.js' },
    
    // 开发环境资源
    { from: 'src/index.html', to: 'index.html' },
    { from: 'src/styles.css', to: 'styles.css' },
    { from: 'src/js/error-handler.js', to: 'js/error-handler.js' },
    { from: 'dist/renderer.bundle.js', to: 'renderer.js' }
  ];

  for (const asset of assets) {
    try {
      // 确保目标目录存在
      await fs.ensureDir(path.dirname(path.join(__dirname, '..', asset.to)));
      
      // 如果源文件和目标文件不同，才进行复制
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