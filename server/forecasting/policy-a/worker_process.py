"""Owned-worker protocol. Prefix-only inputs; complete model-error provenance."""
import os,sys,json,time,traceback,subprocess
from pathlib import Path
R=Path(__file__).resolve().parent
os.environ['NUMBA_CACHE_DIR']=str(R/'runtime/numba');os.environ['MPLCONFIGDIR']=str(R/'runtime/mpl')
for name in ['OMP_NUM_THREADS','MKL_NUM_THREADS','OPENBLAS_NUM_THREADS','NUMBA_NUM_THREADS']:os.environ[name]='1'
def emit(value):print(json.dumps(value,allow_nan=False,default=lambda v:v.item() if hasattr(v,'item') else str(v)),flush=True)
if len(sys.argv)>1 and sys.argv[1]=='sleeping_descendant':
    payload=bytearray(int(sys.argv[2])*1048576)
    for i in range(0,len(payload),4096):payload[i]=1
    time.sleep(30);sys.exit(0)
nonce=sys.argv[1];emit({'event':'handshake','pid':os.getpid(),'parent_pid':os.getppid(),'nonce':nonce,'executable':sys.executable})
initial=json.loads(sys.stdin.readline());assert initial.get('nonce')==nonce and initial.get('cmd')=='initialize'
if initial.get('fixture_startup_hang'):time.sleep(30)
if initial.get('fixture_startup_crash'):os._exit(73)
start=time.perf_counter()
if initial.get('load_models',True):from engine import predict,METHODS
emit({'event':'ready','pid':os.getpid(),'import_seconds':time.perf_counter()-start})
for line in sys.stdin:
    task=json.loads(line)
    if task.get('cmd')=='stop':break
    start=time.perf_counter();index=task['task_index']
    try:
        if task['cmd']=='fixture':
            mode=task.get('mode','normal')
            if mode=='crash':os._exit(74)
            if mode=='hang':time.sleep(30)
            if mode in ['tree','tree_hang','tree_memory']:
                children=[]
                for _ in range(task.get('children',2)):
                    p=subprocess.Popen([sys.executable,'-X','utf8','-B',str(__file__),'sleeping_descendant',str(task.get('child_MiB',1))],creationflags=0x08000000,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);children.append(p.pid)
                emit({'event':'fixture_children','pids':children,'task_index':index});time.sleep(30 if mode!='tree' else .3)
            allocations=[]
            for _ in range(task.get('allocate_MiB',0)):
                block=bytearray(1048576)
                for offset in range(0,len(block),4096):block[offset]=1
                allocations.append(block);time.sleep(task.get('allocation_delay',.004))
            if task.get('hold_seconds'):time.sleep(task['hold_seconds'])
            import psutil
            result={'prediction':7.,'actual_model':'fixture','failed':False,'worker_self_pid':os.getpid(),'worker_self_rss_MiB':psutil.Process().memory_info().rss/1048576}
        else:
            assert task['cmd']=='forecast' and set(task)=={'cmd','task_index','method','values'}
            assert task['method'] in METHODS and 24<=len(task['values'])<=120
            result=predict(task['method'],task['values'])
        import hashlib
        emit({'event':'result','task_index':index,'result':result,'elapsed_seconds':time.perf_counter()-start,'training_digest':hashlib.sha256(json.dumps(task.get('values',[]),separators=(',',':')).encode()).hexdigest()})
    except MemoryError:emit({'event':'memory_error','task_index':index,'type':'MemoryError'});break
    except Exception as e:emit({'event':'model_error','task_index':index,'type':type(e).__name__,'message':str(e),'traceback':traceback.format_exc(),'stage':'unhandled_worker_error'})
