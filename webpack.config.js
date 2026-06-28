const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const SILLYTAVERN_INTERFACE_ICON_DIR = path.join(
	__dirname,
	"src/packages/features/sillytavern-interface/icons",
);

module.exports = (_, argv) => {
	const isProduction = argv.mode === "production";

	return {
		entry: path.join(__dirname, "src/index.js"),
		output: {
			path: path.join(__dirname, "dist"),
			filename: "index.js",
			clean: true,
		},
		resolve: {
			extensions: [".ts", ".tsx", ".js", ".jsx"],
			alias: {
				"@": path.join(__dirname, "src"),
			},
		},
		module: {
			rules: [
				{
					test: /\.(ts|tsx|js|jsx)$/,
					exclude: /node_modules/,
					loader: "babel-loader",
					options: {
						cacheDirectory: true,
						presets: [
							"@babel/preset-env",
							["@babel/preset-react", { runtime: "automatic" }],
							"@babel/preset-typescript",
						],
					},
				},
				{
					test: /\.svg$/i,
					include: SILLYTAVERN_INTERFACE_ICON_DIR,
					resourceQuery: /raw/,
					type: "asset/source",
				},
				{
					test: /\.css$/i,
					use: [
						MiniCssExtractPlugin.loader,
						"css-loader",
						"postcss-loader",
					],
				},
			],
		},
		plugins: [
			new MiniCssExtractPlugin({
				filename: "style.css",
			}),
		],
		// AstraProjecta ships as a single SillyTavern extension bundle, so
		// webpack's default app-sized performance hints are not actionable.
		performance: {
			hints: false,
		},
		devtool: isProduction ? false : "source-map",
		optimization: {
			minimize: isProduction,
			minimizer: [
				new TerserPlugin({
					extractComments: false,
				}),
			],
		},
	};
};
