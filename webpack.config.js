const path = require('path');
const glob = require('glob');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (env, argv) => {
    const mode = argv.mode || 'development';
    const shouldAnalyze = env && env.ANALYZE === 'true';

    const entryFiles = glob.sync('./src/**/*.{ts,tsx}');
    console.log('Entry files:', entryFiles);

    // 定义特定的入口
    const entry = {
        background: './src/background.ts', // 确保这里的路径正确
        main: './src/main.ts',             // 确保这里的路径正确
        home: './src/home.ts'              // 确保这里的路径正确
    };

    const plugins = [
        new webpack.IgnorePlugin({
            checkResource(resource) {
                return /.*\/wordlists\/(?!english).*\.json/.test(resource);
            }
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser'
        })
    ];

    if (shouldAnalyze) {
        plugins.push(new BundleAnalyzerPlugin());
    }

    return {
        mode: mode,
        devtool: mode === 'development' ? 'inline-source-map' : 'source-map',
        entry: entry,
        output: {
            filename: 'js/[name].js', // 生成的文件位于 extension/js 目录下
            path: path.resolve(__dirname, 'extension'),
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        optimization: {
            usedExports: true,
            splitChunks: {
                chunks: 'all',
                minSize: 30000,
                automaticNameDelimiter: '-',
                cacheGroups: {
                    commons: {
                        name: 'commons',
                        chunks: 'initial',
                        minChunks: 2
                    },
                    vendors: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all'
                    }
                }
            }
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            fallback: {
                "buffer": require.resolve("buffer/"),
                "crypto": require.resolve("crypto-browserify"),
                "stream": require.resolve("stream-browserify"),
                "vm": require.resolve("vm-browserify"),
                "process": require.resolve("process/browser")
            }
        },
        plugins: plugins,
    };
};
