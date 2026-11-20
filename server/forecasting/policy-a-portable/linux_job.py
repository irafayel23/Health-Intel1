"""Linux cgroup-v2 hard memory boundary; never substitutes a sampled-only limit."""
import os, signal, subprocess, time, uuid
from pathlib import Path
import psutil

class LinuxJob:
    def __init__(self, rss_limit_MiB=512, commit_limit_MiB=512):
        self.rss_limit=int(rss_limit_MiB*1048576)
        self.commit_limit=int(commit_limit_MiB*1048576)
        if not self.rss_limit or not self.commit_limit: raise RuntimeError('Positive memory limits required')
        membership=Path('/proc/self/cgroup').read_text().strip().splitlines()
        own=next((s.split('::',1)[1] for s in membership if s.startswith('0::')),None)
        if own is None: raise RuntimeError('Linux worker requires delegated cgroup v2')
        parent=Path(os.environ.get('OPERATIONAL_SARIMA_CGROUP_ROOT',str(Path('/sys/fs/cgroup')/own.lstrip('/')))).resolve()
        if not parent.is_relative_to('/sys/fs/cgroup'):raise RuntimeError('Worker cgroup must be beneath /sys/fs/cgroup')
        if 'memory' not in (parent/'cgroup.subtree_control').read_text().split():raise RuntimeError('Delegate and enable the memory controller for the configured worker cgroup root')
        self.path=parent/('health-intel-worker-'+uuid.uuid4().hex)
        self.path.mkdir(mode=0o700)
        self.closed=False;self.process=None;self.interpreter_pid=None
        self.events=[];self.seen_pids=set();self.peak_rss=0
        try:
            (self.path/'memory.max').write_text(str(self.commit_limit))
            (self.path/'memory.swap.max').write_text('0')
            (self.path/'memory.oom.group').write_text('1')
            if not (self.path/'cgroup.kill').exists(): raise RuntimeError('Linux cgroup.kill support required')
            assert int((self.path/'memory.max').read_text())==self.commit_limit
            assert (self.path/'memory.swap.max').read_text().strip()=='0'
            self.kernel_limit_verified=True
        except BaseException:
            self.path.rmdir()
            raise

    def members(self):
        return [int(p) for p in (self.path/'cgroup.procs').read_text().split()]

    def contains(self,pid): return pid in self.members()

    def image_path(self,pid): return str(Path('/proc',str(pid),'exe').resolve(strict=True))

    def launch_suspended(self,args,**kwargs):
        # Runs before exec and scientific imports; the inherited cgroup contains descendants.
        # Popen is invoked before supervisor reader threads are started.
        def enter():
            import ctypes
            parent=os.getppid()
            if ctypes.CDLL(None).prctl(1,signal.SIGKILL,0,0,0)!=0: os._exit(125)
            if os.getppid()!=parent: os._exit(125)
            (self.path/'cgroup.procs').write_text(str(os.getpid()))
        self.process=subprocess.Popen(args,start_new_session=True,preexec_fn=enter,**kwargs)
        return self.process

    def sample(self):
        pids=self.members();rss=interpreter=0
        for pid in pids:
            try: value=psutil.Process(pid).memory_info().rss
            except psutil.NoSuchProcess: continue
            rss+=value
            if pid==self.interpreter_pid:interpreter=value
            self.seen_pids.add(pid)
        self.peak_rss=max(self.peak_rss,rss)
        counts=dict(line.split() for line in (self.path/'memory.events').read_text().splitlines())
        if int(counts.get('oom',0)) or int(counts.get('oom_kill',0)):self.events=[{'message':9}]
        return {'job_rss_bytes':rss,'interpreter_rss_bytes':interpreter,'active_pids':pids}

    def terminate(self,reason_code=250):
        (self.path/'cgroup.kill').write_text('1')
        until=time.monotonic()+5
        while self.members() and time.monotonic()<until:time.sleep(.01)
        if self.members():raise RuntimeError('Linux worker cgroup still populated')

    def evidence(self):
        return {'controller':'linux-cgroup-v2','actual_interpreter_pid':self.interpreter_pid,
                'observed_member_pids':sorted(self.seen_pids),'sampled_peak_job_rss_MiB':self.peak_rss/1048576,
                'rss_limit_MiB':self.rss_limit/1048576,'hard_cgroup_memory_limit_MiB':self.commit_limit/1048576,
                'kernel_limit_verified':self.kernel_limit_verified,'job_events':list(self.events)}

    def close(self):
        if self.closed:return
        try:
            if self.process is not None:self.terminate()
            self.path.rmdir()
        finally:self.closed=True
