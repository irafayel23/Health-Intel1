const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
require('../config/security-config').loadEnvironment();
// Historical-schema fixtures deliberately use the preserved source as a read-only
// template. Each test creates and removes its own disposable database.
if(process.env.DB_TEST_SOURCE_NAME)process.env.DB_NAME=process.env.DB_TEST_SOURCE_NAME;
const files=process.argv.includes('--normalization')?['normalized-schema.test.js']:
    fs.readdirSync(path.join(__dirname,'../tests')).filter(name=>name.endsWith('.test.js')).sort();
const child=spawn(process.execPath,['--test',...files.map(name=>'tests/'+name)],{cwd:path.join(__dirname,'..'),stdio:'inherit',windowsHide:true});
child.on('error',()=>{console.error('Could not start the test runner.');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
