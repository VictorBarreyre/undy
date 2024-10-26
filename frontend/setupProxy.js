// setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'https://undy-93a12c731bb4.herokuapp.com',
            changeOrigin: true,
        })
    );
};
