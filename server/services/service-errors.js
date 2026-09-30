// Shared input validation and safe API error responses.

function invalid(message,status=400){const error=new Error(message);error.status=status;return error;}
function plain(value,label,max,optional=false){
    if(optional&&(value===undefined||value===null||value===''))return '';
    if(typeof value!=='string')throw invalid(`Enter a valid ${label}.`);
    const text=value.trim();
    if(!text||text.length>max||/[<>\x00-\x1f\x7f]/.test(text))throw invalid(`Enter a valid ${label} (maximum ${max} characters).`);
    return text;
}
function respond(res,error,fallback){res.status(error.status||(error.code==='ER_DUP_ENTRY'?409:503)).json({success:false,error:error.status?error.message:error.code==='ER_DUP_ENTRY'?'This email or disease name is already registered.':fallback});}

module.exports = { invalid, plain, respond };
