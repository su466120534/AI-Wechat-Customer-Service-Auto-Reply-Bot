const fs = require('fs-extra');
const path = require('path');

async function copyAssets() {
  const assets = [
    // 生产环境资源
    { from: 'src/renderer/index.html', to: 'dist/index.html' },
    { from: 'src/renderer/styles/index.css', to: 'dist/styles/index.css' },
    { from: 'src/renderer/js/error-handler.js', to: 'dist/js/error-handler.js' },
    { from: 'dist/renderer.bundle.js', to: 'dist/renderer.bundle.js' }
  ];

  for (const asset of assets) {
    try {
      // 确保目标目录存在
      await fs.ensureDir(path.dirname(path.join(__dirname, '..', asset.to)));
      
      const sourcePath = path.join(__dirname, '..', asset.from);
      const targetPath = path.join(__dirname, '..', asset.to);
      
      // 检查源文件是否存在
      if (fs.existsSync(sourcePath)) {
        if (sourcePath !== targetPath) {
          await fs.copy(sourcePath, targetPath);
          console.log(`✓ Copied ${asset.from} to ${asset.to}`);
        } else {
          console.log(`- Skipped ${asset.from} (same as target)`);
        }
      } else {
        console.warn(`! Source file not found: ${asset.from}`);
      }
    } catch (error) {
      // 记录错误但继续执行
      console.error(`✗ Failed to copy ${asset.from}:`, error);
    }
  }

  // 尝试复制图标文件（如果存在）
  try {
    const iconFiles = [
      { from: 'assets/icon.icns', to: 'dist/assets/icon.icns' },
      { from: 'assets/icon.ico', to: 'dist/assets/icon.ico' }
    ];

    for (const icon of iconFiles) {
      const sourcePath = path.join(__dirname, '..', icon.from);
      if (fs.existsSync(sourcePath)) {
        await fs.ensureDir(path.dirname(path.join(__dirname, '..', icon.to)));
        await fs.copy(sourcePath, path.join(__dirname, '..', icon.to));
        console.log(`✓ Copied ${icon.from}`);
      } else {
        console.log(`- Skipped ${icon.from} (not found)`);
      }
    }
  } catch (error) {
    console.warn('! Failed to copy icon files:', error);
  }
}

copyAssets().catch(error => {
  console.error('Error in copyAssets:', error);
  process.exit(1);
});