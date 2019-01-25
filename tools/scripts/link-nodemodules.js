const shell = require('shelljs');

var args = process.argv.slice(2);
const baseDir = args[0] || '.';

shell.exec(`
for dir in ${baseDir}/tmp/*/
do
    dir=\${dir%*/}
    rm -rf $dir/node_modules/@nrwl
    cp -r ${baseDir}/node_modules/@nrwl $dir/node_modules/@nrwl
    echo $dir
done
`);
