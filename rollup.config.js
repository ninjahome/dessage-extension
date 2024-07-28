import glob from 'glob';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import replace from '@rollup/plugin-replace';
import { visualizer } from 'rollup-plugin-visualizer';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import nodePolyfills from 'rollup-plugin-node-polyfills';

const shouldAnalyze = process.env.ANALYZE === 'true';

const entryFiles = glob.sync('./src/**/*.{ts,tsx}');
console.log('Entry files:', entryFiles);

const plugins = [
    resolve({
        browser: true,
        preferBuiltins: false
    }),
    commonjs({
        include: /node_modules/
    }),
    json(),
    typescript({
        tsconfig: "tsconfig.json",
        useTsconfigDeclarationDir: true
    }),
    babel({
        exclude: 'node_modules/**',
        babelHelpers: 'bundled',
        presets: ['@babel/preset-env']
    }),
    replace({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        preventAssignment: true
    }),
    nodePolyfills(),
    shouldAnalyze && visualizer()
];

const outputConfig = {
    dir: 'extension/js',
    format: 'esm',  // 修改此处为 'esm'
    sourcemap: true,
    entryFileNames: '[name].js'
};

const inputConfig = entryFiles.reduce((acc, filePath) => {
    const entryName = filePath.replace(/^\.\/src\//, '').replace(/\.(ts|tsx)$/, '');
    acc[entryName] = filePath;
    return acc;
}, {});

export default {
    input: inputConfig,
    output: outputConfig,
    plugins: plugins.filter(Boolean)
};
