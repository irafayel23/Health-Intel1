"""Synthetic QA only. Exercises the real platform controller; no DB or publication."""
import sys,os,json,tempfile
from pathlib import Path
runtime=Path(sys.argv[1]);sys.path.insert(0,str(runtime))
os.environ['HEALTH_INTEL_RUNTIME_DIR']=tempfile.mkdtemp(prefix='hi-controller-QA-')
from supervisor import Worker,ControlledFailure
prefix=([3,3,4,4,5,6,6,5,4,3,2,2]*4)[:45]
with Worker() as w:
    response=w.call({'cmd':'forecast','task_index':1,'method':'optimized0','values':prefix})
    assert response['event']=='result'
    assert response['resource']['kernel_limit_verified']
    Path(sys.argv[2]).write_text(json.dumps(response['result'],sort_keys=True))
assert w.final_evidence['job_empty_after_termination']
print('PASS actual scientific forecast through bounded controller; job empty after close')
try:
    w=Worker(load_models=False,fit_seconds=.3)
    w.call({'cmd':'fixture','task_index':2,'mode':'tree_hang','children':2,'child_MiB':1})
    raise AssertionError('Timeout was not enforced')
except ControlledFailure as e:
    assert e.reason=='fit_timeout',e.reason
    assert e.evidence['job_empty_after_termination']
print('PASS deadline terminates worker and descendants')
try:
    w=Worker(load_models=False)
    w.call({'cmd':'fixture','task_index':3,'mode':'crash'})
    raise AssertionError('Crash was not detected')
except ControlledFailure as e:
    assert e.reason=='worker_exit',e.reason
    assert e.evidence['job_empty_after_termination']
print('PASS crash detected and owned job cleaned up')
