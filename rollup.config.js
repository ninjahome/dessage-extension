import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import replace from '@rollup/plugin-replace';
import { visualizer } from 'rollup-plugin-visualizer';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import inject from '@rollup/plugin-inject';
import terser from '@rollup/plugin-terser';
import glob from 'glob';
import path from 'path';

const shouldAnalyze = process.env.ANALYZE === 'true';

const entryFiles = glob.sync('./src/**/*.{ts,tsx}');
console.log('Entry files:', entryFiles);

const plugins = [
    resolve({
        browser: true,
        preferBuiltins: false
    }),
    commonjs({
        include: 'node_modules/**'
    }),
    json(),
    typescript({
        tsconfig: "tsconfig.json"
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
    inject({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser'
    }),
    terser(),
    shouldAnalyze && visualizer({
        filename: 'bundle-analysis.html',
        open: true, // Automatically opens the report in your default browser
    })
];

const outputConfig = {
    format: 'iife', // 使用iife格式
    sourcemap: true
};

const configs = entryFiles.map(filePath => {
    const entryName = path.relative('./src', filePath).replace(/\.(ts|tsx)$/, '');
    return {
        input: filePath,
        output: {
            ...outputConfig,
            file: `extension/js/${entryName}.js`
        },
        plugins: plugins.filter(Boolean)
    };
});

export default configs;
