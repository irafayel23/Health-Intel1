// Test-only trusted-key substitution. Production never imports this module.
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { CERTIFICATE_URL } = require('../firebase-verification');
const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKey = pair.publicKey.export({type:'spki',format:'pem'});
const projectId = 'health-intel-2a0ed';
function token(email, overrides = {}, options = {}) {
    const time = Math.floor(Date.now()/1000);
    const claims={sub:'disposable-firebase-fixture',aud:projectId,iss:'https://securetoken.google.com/'+projectId,iat:time,exp:time+600,auth_time:time,email,email_verified:true,firebase:{sign_in_provider:'google.com'},...overrides};
    for(const key of Object.keys(claims))if(claims[key]===undefined)delete claims[key];
    return jwt.sign(claims, pair.privateKey, {algorithm:'RS256',keyid:'qa-trusted-key',...options});
}
function install() {
    const originalFetch = global.fetch;
    global.fetch = (input, options) => String(input?.url || input) === CERTIFICATE_URL
        ? Promise.resolve(new Response(JSON.stringify({'qa-trusted-key':publicKey}),{headers:{'cache-control':'public, max-age=3600'}}))
        : originalFetch(input, options);
    return () => { global.fetch = originalFetch; };
}
module.exports = {token,install,publicKey,projectId,pair};
