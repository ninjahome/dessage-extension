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
    shouldAnalyze && visualizer()
];

const outputConfig = {
    dir: 'extension/js',
    format: 'es',
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
