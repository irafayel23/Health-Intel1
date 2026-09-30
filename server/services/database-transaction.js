const crypto = require('node:crypto');
const { invalid } = require('./service-errors');

async function transaction(db,action,lockLabel){
    const connection=await db.getConnection();let lock,started=false;
    try{
        if(lockLabel){const [[database]]=await connection.query('SELECT DATABASE() AS name');lock='health-intel:'+crypto.createHash('sha256').update(database.name+':'+lockLabel).digest('hex').slice(0,40);const [[result]]=await connection.execute('SELECT GET_LOCK(?,10) AS acquired',[lock]);if(result.acquired!==1)throw invalid('Another request is being processed. Please try again.',503);}
        await connection.beginTransaction();started=true;
        const result=await action(connection);await connection.commit();started=false;return result;
    }catch(error){if(started)await connection.rollback();throw error;}
    finally{try{if(lock)await connection.execute('SELECT RELEASE_LOCK(?)',[lock]);}finally{connection.release();}}
}

module.exports = { transaction };
