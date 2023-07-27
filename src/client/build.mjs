import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';

console.log("Building omni-core-collectionmanager....")
await esbuild.build({
    entryPoints: ['./main.ts'],
    bundle: true,
    platform: 'browser',
    target: ['es2020'],
    format: 'esm',
    color: true,
    outdir: '../../public/',
    plugins: [sassPlugin({
        type: 'css',
    })],
}).catch(() => process.exit(1))