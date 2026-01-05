// electron-app/webpack.renderer.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
  target: 'electron-renderer',
  entry: './src/renderer/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx']
  },
  plugins: [
        new Dotenv({
      path: './.env', // Path to your local .env file
      safe: false,     // load .env.example (optional)
      systemvars: true // allow reading from system env vars (for CI/CD)
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    // ✅ Copy PDF.js worker
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.js'),
          to: path.resolve(__dirname, 'dist/renderer/pdf.worker.min.js')
        }
      ]
    })
  ],
  devtool: 'source-map'
};
