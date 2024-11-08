const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function verifyBuild() {
  console.log('开始构建验证...');

  // 1. 验证 TypeScript 编译
  console.log('\n检查 TypeScript 编译...');
  try {
    execSync('yarn build:ts', { stdio: 'inherit' });
    console.log('✅ TypeScript 编译成功');
  } catch (error) {
    console.error('❌ TypeScript 编译失败');
    process.exit(1);
  }

  // 2. 验证编译输出
  console.log('\n检查编译输出文件...');
  const requiredFiles = [
    'main/index.js',
    'main/preload.js',
    'renderer/index.js',
    'main/utils/logger.js',
    'main/utils/scheduler.js',
    'renderer/components/loading.js',
    'renderer/components/notification.js'
  ];

  const missingFiles = requiredFiles.filter(file => 
    !fs.existsSync(path.join(__dirname, '../dist', file))
  );

  if (missingFiles.length > 0) {
    console.error('❌ 缺少以下编译输出文件:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }
  console.log('✅ 所有必需文件已生成');

  // 3. 验证资源文件复制
  console.log('\n检查资源文件...');
  const resourceFiles = [
    'index.html',
    'styles/index.css',
    'renderer.bundle.js'
  ];

  const missingResources = resourceFiles.filter(file => 
    !fs.existsSync(path.join(__dirname, '../dist', file))
  );

  if (missingResources.length > 0) {
    console.error('❌ 缺少以下资源文件:');
    missingResources.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }
  console.log('✅ 所有资源文件已复制');

  // 4. 验证依赖完整性
  console.log('\n检查依赖完整性...');
  try {
    execSync('yarn list --production --depth=0', { stdio: 'inherit' });
    console.log('✅ 依赖检查通过');
  } catch (error) {
    console.error('❌ 依赖检查失败');
    process.exit(1);
  }

  console.log('\n🎉 构建验证完成！');
}

verifyBuild(); 