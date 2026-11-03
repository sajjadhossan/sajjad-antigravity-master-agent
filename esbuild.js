const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const extensionCtx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'info',
    treeShaking: true,
  });

  const testCtx = await esbuild.context({
    entryPoints: ['src/tests/runTests.ts'],
    bundle: true,
    format: 'cjs',
    minify: false,
    sourcemap: true,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/tests/runTests.js',
    alias: {
      vscode: require('path').resolve(__dirname, 'src/tests/vscode-mock.ts'),
    },
    logLevel: 'info',
  });

  if (watch) {
    await extensionCtx.watch();
    await testCtx.watch();
    console.log('Watching for changes...');
  } else {
    await extensionCtx.rebuild();
    await extensionCtx.dispose();
    await testCtx.rebuild();
    await testCtx.dispose();
    console.log('Build complete.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
