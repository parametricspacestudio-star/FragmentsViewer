import esbuild from 'esbuild';
import esbuildPluginTypecheck from '@jgoz/esbuild-plugin-typecheck';

let argv = process.argv.slice (2);
let isServeMode = (argv.length > 0 && argv[0] == 'serve');
let buildParams = {
    entryPoints: ['source/main.ts'],
    format: 'esm',
    plugins: [
        esbuildPluginTypecheck.typecheckPlugin ()
    ],
    bundle: true,
    minify: true,
    outdir: 'public'
};

if (isServeMode) {
    let context = await esbuild.context (buildParams);
    await context.watch ();
    let { host, port } = await context.serve ({
        servedir : '.',
        host: '0.0.0.0',
        port: 5000
    });
    console.log ('Serving: http://0.0.0.0:' + port.toString ());
} else {
    await esbuild.build (buildParams);
}
