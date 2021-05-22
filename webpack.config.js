const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const APP_DIR = path.resolve(__dirname, './src');
const MONACO_DIR = path.resolve(__dirname, './node_modules/monaco-editor');

module.exports = {
	target: "electron-renderer",
	mode: 'production',
	entry: ['./src/frontend/script.tsx'],
	devtool: 'source-map',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/frontend'),
	},
	resolve: {
		enforceExtension: false,
		extensions: ['.js', '.ts', '.tsx', ".css"]
	},
	optimization: {
		minimize: false
	},
	devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9999
  },
	module: {
		rules: [
			{
				test: /\.(ts|tsx)$/,
				use: {
					loader: 'ts-loader'
				}
			},
			{
				test: /\.css$/,
				include: APP_DIR,
				use: [{
					loader: 'style-loader',
				},
					{
					loader: 'css-loader',
					// options: {
					// 	modules: true,
					// 	namedExport: true,
					// },
				}],
			},
			{
				test: /\.css$/,
				include: MONACO_DIR,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /\.ttf$/,
				use: ['file-loader']
			}
		]
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, 'src/frontend/index.html'),	
		}),
		new webpack.SourceMapDevToolPlugin({
			lineToLine: true
		}),
		new MonacoWebpackPlugin()
	],
};
