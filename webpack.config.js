const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

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
		extensions: ['.js', '.ts', '.tsx']
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
				include: path.resolve(__dirname, "./src"),
				use: ['style-loader', 'css-loader'],
			}, {
				test: /\.css$/,
				include: path.resolve(__dirname, "./node_modules/monaco-editor"),
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
		new MonacoWebpackPlugin({
			// available options are documented at https://github.com/Microsoft/monaco-editor-webpack-plugin#options
      languages: ['json', "javascript", "typescript", 'python']
    })
	],
};
