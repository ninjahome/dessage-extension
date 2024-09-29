const { execSync } = require('child_process');
// 编译 utils.ts，生成 .d.ts 文件在 src 目录下，JavaScript 文件在 dsg_ext/js 目录下
execSync('tsc src/util.ts --outDir dsg_ext/js --declaration --declarationDir src --target es2015', { stdio: 'inherit' });

// 编译其他入口文件，生成 JavaScript 文件在 dsg_ext/js 目录下
// execSync('tsc src/main.ts src/home.ts src/background.ts --outDir dsg_ext/js --target es2015', { stdio: 'inherit' });
execSync('tsc src/multi_addr.ts --outDir dsg_ext/js --target es2015', { stdio: 'inherit' });

console.log('Build completed successfully.');
