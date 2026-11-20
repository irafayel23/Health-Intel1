"""Operational orchestration only; fitting/selection code is frozen policy A."""
import json,sys,os,time,hashlib,msvcrt
from pathlib import Path
from common import digest,put
from selection import select
from supervisor import Worker,ControlledFailure
from host_admission import HostAdmission
ROOT=Path(__file__).resolve().parent
def main():
    source,dest,progress=map(Path,sys.argv[1:4]);policy_hash=sys.argv[4]
    from importlib.metadata import version
    expected={'numpy':'2.3.5','pandas':'2.3.3','scipy':'1.18.1','statsmodels':'0.15.0','pmdarima':'2.1.1','psutil':'7.2.2'}
    for package,required in expected.items():
        if version(package)!=required:raise RuntimeError('Scientific environment version mismatch: '+package)
    data=json.loads(source.read_text(encoding='utf-8'))
    manifest=json.loads((ROOT/'source-manifest.json').read_text())
    # Node's canonical insertion order is retained by Python's JSON reader.
    assert digest(manifest)==policy_hash and data['policy_sha256']==policy_hash
    for name,h in manifest.items():assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==h
    assert data['mode']=='operational' and len(data['scopes'])==70
    count=len(data['scopes'][0]['history']);assert 45<=count<=120
    dates=[];y,m=map(int,data['start'].split('-'))
    for i in range(count+1):dates.append(f'{y+(m-1+i)//12:04}-{(m-1+i)%12+1:02}')
    assert dates[-2:]==[data['cutoff'],data['target']]
    gate=HostAdmission();worker=None;calls=0;started=time.monotonic()
    shared=dest.parent.parent;shared.mkdir(exist_ok=True,parents=True)
    cache_dir=shared/'prefix-cache';cache_dir.mkdir(exist_ok=True)
    # OS-held advisory lease survives a web-server restart and prevents duplicate fitting.
    with (shared/'worker.lock').open('a+b') as lock:
        if not lock.tell():lock.write(b'0');lock.flush()
        lock.seek(0);msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
        scopes=[]
        try:
            for index,item in enumerate(data['scopes']):
                values=item['history'];assert len(values)==count and all(type(v)is int and v>=0 for v in values)
                local={}
                def get(n,c):
                    nonlocal worker,calls
                    if (n,c) in local:return local[n,c]
                    prefix=values[:n];key=digest([policy_hash,'optimized',c,prefix]);cache=cache_dir/(key+'.json')
                    if cache.exists():
                        saved=json.loads(cache.read_text());assert saved['key']==key
                        local[n,c]=saved['result'];return local[n,c]
                    put(progress,{'state':'fitting_or_waiting_for_memory','completed':index,'total':70,'prefix_months':n,'candidate':c,'fit_calls':calls})
                    if time.monotonic()-started>12*60*60:raise RuntimeError('Overall run time budget exceeded')
                    if worker is None:gate.acquire('monthly');worker=Worker(sample_observer=lambda b:gate.observe('monthly',b),host_check=gate.emergency_reason)
                    calls+=1
                    try:
                        response=worker.call({'cmd':'forecast','task_index':calls,'method':f'optimized{c}','values':prefix})
                        if response.get('event')!='result':raise RuntimeError('Scientific worker failed; inspect private worker log')
                        assert response['training_digest']==digest(prefix)
                        result=response['result']
                    except ControlledFailure as error:
                        result={'usable':False,'prediction':None,'raw_prediction':None,'lower':None,'upper':None,'actual_model':'SARIMA forecast unavailable','stage':'resource_control','reason':error.reason}
                        worker=None;gate.release('monthly')
                    local[n,c]=result
                    # Resource failures remain failures for this run, but are never cached as scientific results.
                    if result.get('stage')!='resource_control':put(cache,{'key':key,'result':result})
                    return result
                outputs=[]
                for n in range(31,count+1):
                    chosen=select(n,values,get,'optimized')
                    outputs.append({'n':n,'target':dates[n],'actual':values[n] if n<count else None,'training_digest':digest(values[:n]),'sarima':chosen})
                scopes.append({**item,'outputs':outputs})
                put(dest.parent/f'scope-{index:02}.json',scopes[-1]);put(progress,{'state':'fitting','completed':index+1,'total':70,'fit_calls':calls})
            put(dest,{'input_sha256':digest(data),'policy_sha256':policy_hash,'seasonal_evidence_year_labels_are_relative':True,'scopes':scopes})
            put(progress,{'state':'complete','completed':70,'total':70,'fit_calls':calls})
        finally:
            if worker:worker.close();gate.release('monthly')
            lock.seek(0);msvcrt.locking(lock.fileno(),msvcrt.LK_UNLCK,1)
if __name__=='__main__':
    try:main()
    except Exception as error:
        if len(sys.argv)>3:put(Path(sys.argv[3]),{'state':'failed','reason':type(error).__name__,'message':str(error)[:200]})
        raise
