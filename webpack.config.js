const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isProduction = process.env.NODE_ENV === 'production';
const extensionRoot = path.resolve(__dirname);
const rootWithSlash = extensionRoot.replace(/\\/g, '/').replace(/\/?$/, '/');
const distDir = path.join(extensionRoot, 'dist');

const normalizePath = (value = '') => value.replace(/\\/g, '/');
const toDistRelative = (absolutePath) => {
    const relPath = normalizePath(path.relative(distDir, absolutePath));
    if (!relPath || relPath.startsWith('../') || relPath.startsWith('./')) {
        return relPath || '.';
    }
    return `./${relPath}`;
};

module.exports = {
    mode: isProduction ? 'production' : 'development',
    entry: path.join(extensionRoot, 'src/index.js'),
    output: {
        path: path.join(extensionRoot, 'dist/'),
        filename: 'index.js',
        clean: true,
        library: {
            type: 'module',
        },
    },
    experiments: {
        outputModule: true,
    },
    externalsType: 'module',
    externals: [
        ({ context = '', request }, callback) => {
            if (!request) return callback();

            const normalizedRequest = normalizePath(request);
            if (normalizedRequest.endsWith('.css')) {
                return callback();
            }

            const fromDir = context ? normalizePath(context) : extensionRoot;

            if (normalizedRequest.startsWith('.')) {
                try {
                    const targetPath = normalizePath(
                        path.resolve(fromDir, request),
                    );

                    if (!targetPath.startsWith(rootWithSlash)) {
                        const distRelative = toDistRelative(targetPath);
                        return callback(null, `module ${distRelative}`);
                    }
                } catch (error) {
                    return callback(null, `module ${request}`);
                }
            }

            callback();
        },
    ],
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'style.css',
        }),
    ],
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        alias: {
            '@': path.join(extensionRoot, 'src'),
        },
    },
    devtool: isProduction ? false : 'source-map',
    module: {
        rules: [
            {
                test: /\.[jt]sx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: true,
                        presets: [
                            '@babel/preset-env',
                            ['@babel/preset-react', { runtime: 'automatic' }],
                            '@babel/preset-typescript',
                        ],
                    },
                },
            },
            {
                test: /\.module\.css$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            modules: {
                                localIdentName: isProduction
                                    ? '[hash:base64:8]'
                                    : '[path][name]__[local]',
                            },
                        },
                    },
                    'postcss-loader',
                ],
            },
            {
                test: /\.css$/i,
                exclude: /\.module\.css$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'postcss-loader',
                ],
            },
        ],
    },
    devServer: {
        static: {
            directory: path.join(extensionRoot, 'dist'),
        },
        devMiddleware: {
            writeToDisk: true,
        },
        hot: false,
        liveReload: true,
    },
    optimization: {
        minimize: isProduction,
        minimizer: [
            new TerserPlugin({
                extractComments: false,
            }),
        ],
    },
};
