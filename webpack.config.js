const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (env, argv) => {
    const mode = argv.mode || 'development';
    const shouldAnalyze = env && env.ANALYZE === 'true';

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
        devtool: mode === 'development' ? 'source-map' : 'inline-source-map',  // 确保开发模式下生成Source Map
        entry: {
            background: path.resolve(__dirname, './src/background.ts'),
            home: path.resolve(__dirname, './src/home.ts'),
            main: path.resolve(__dirname, './src/main.ts'),
            inject: path.resolve(__dirname, './src/inject.ts'),
            content: path.resolve(__dirname, './src/content.ts'),
        },
        output: {
            filename: 'js/[name].js',
            path: path.resolve(__dirname, 'dsg_ext'),
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
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            fallback: {
                assert: false,
                stream: false,
                crypto: false,
                buffer: false,
                process: false,
                vm: false,
            }
        },
        plugins: plugins,
    };
};
