import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import esbuild from 'esbuild';
import esbuildPluginTypecheck from '@jgoz/esbuild-plugin-typecheck';

let argv = process.argv.slice(2);
let isServeMode = (argv.length > 0 && argv[0] == 'serve');
let buildParams = {
    entryPoints: ['source/main.ts'],
    format: 'esm',
    plugins: [
        esbuildPluginTypecheck.typecheckPlugin()
    ],
    bundle: true,
    minify: true,
    outdir: 'public'
};

if (isServeMode) {
    let context = await esbuild.context(buildParams);
    await context.watch();
    
    let { host: esHost, port: esPort } = await context.serve({
        servedir: 'public'
    });

    const app = express();

    app.use(express.static('public'));

    app.use('/', createProxyMiddleware({
        target: `http://127.0.0.1:${esPort}`,
        changeOrigin: true,
        ws: true,
        onProxyReq: (proxyReq) => {
            proxyReq.setHeader('host', 'localhost');
        }
    }));

    app.listen(5000, '0.0.0.0', () => {
        console.log(`Gateway serving on http://0.0.0.0:5000 -> esbuild on ${esPort}`);
    });
} else {
    await esbuild.build(buildParams);
}
