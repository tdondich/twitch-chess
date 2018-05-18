const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin')


module.exports = {
    mode: process.env.NODE_ENV || 'development',
    performance: { hints: false },
    entry: './src/main.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist/'),
        publicPath: '/dist/'
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            },
            // this will apply to both plain `.js` files
            // AND `<script>` blocks in `.vue` files
            {
                test: /\.js$/,
                loader: 'babel-loader',
                options: {
                    babelrc: false,
                    presets: [["env", {
                        "modules": false
                    }], 'stage-2']
                }
            },
            // this will apply to both plain `.css` files
            // AND `<style>` blocks in `.vue` files
            {
                test: /\.css$/,
                use: [
                    'vue-style-loader',
                    'css-loader',
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    'vue-style-loader',
                    'css-loader',
                    'sass-loader'
                ]
            },
            {
                test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
                loader: 'url-loader',
                query: {
                    limit: 10000,
                    name: './static/img/[name].[hash:7].[ext]'
                }
            }
        ]
    },
    plugins: [
        // make sure to include the plugin!
        new VueLoaderPlugin()
    ],
    resolve: {
        extensions: ['*', '.js', '.vue', '.json'],
        alias: {
            vue: 'vue/dist/vue.js'
        }
    }
};