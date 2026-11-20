"""Read-only scientific/dependency and bounded-resource readiness probe."""
import json, os, sys
from importlib.metadata import version
EXPECTED={'numpy':'2.3.5','pandas':'2.3.3','scipy':'1.18.1','statsmodels':'0.15.0','pmdarima':'2.1.1','psutil':'7.2.2'}

def check():
    for package,required in EXPECTED.items():
        if version(package)!=required:raise RuntimeError('Scientific environment version mismatch: '+package)
    import psutil
    available=psutil.virtual_memory().available//1048576
    if sys.platform=='linux':
        # Account for container/service memory ceilings as well as host RAM.
        from pathlib import Path
        own=next(s.split('::',1)[1] for s in Path('/proc/self/cgroup').read_text().splitlines() if s.startswith('0::'))
        p=Path('/sys/fs/cgroup')/own.lstrip('/')
        while p.is_relative_to('/sys/fs/cgroup'):
            limit=p/'memory.max';used=p/'memory.current'
            if limit.exists() and limit.read_text().strip()!='max':
                available=min(available,(int(limit.read_text())-int(used.read_text()))//1048576)
            if p==Path('/sys/fs/cgroup'):break
            p=p.parent
    if available<1024:raise RuntimeError('Insufficient available memory: need at least 1024 MiB')
    if os.name=='nt':
        from windows_job import WindowsJob as Job
    elif sys.platform=='linux':
        from linux_job import LinuxJob as Job
    else:raise RuntimeError('Unsupported worker platform')
    job=Job()
    try:job.sample()
    finally:job.close()
    return {'ready':True,'platform':sys.platform,'available_MiB':available}

if __name__=='__main__':
    try:print(json.dumps(check()))
    except Exception as e:
        # Return actionable configuration category, never environment values.
        message=str(e) if isinstance(e,RuntimeError) else 'Worker dependencies or delegated resource controller unavailable ('+type(e).__name__+')'
        print(json.dumps({'ready':False,'message':message}))
        sys.exit(1)
