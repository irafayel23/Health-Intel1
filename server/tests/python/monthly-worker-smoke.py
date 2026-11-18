"""Explicit synthetic QA fixture; never import this output into application publications."""
import os,json,sys,tempfile,subprocess,hashlib
from pathlib import Path
repo=Path(sys.argv[1]);runtime=repo/'server/forecasting/policy-a-portable'
sys.path.insert(0,str(runtime))
from common import DISEASES,BARANGAYS,digest
folder=Path(tempfile.mkdtemp(prefix='health-intel-QA-ONLY-monthly-'))
folder=folder/'run';folder.mkdir()
os.environ['HEALTH_INTEL_RUNTIME_DIR']=str(folder)
manifest=json.loads((repo/'server/forecasting/policy-a/source-manifest.json').read_text())
data={'mode':'operational','start':'2023-01','cutoff':'2026-09','target':'2026-10','policy_sha256':digest(manifest),'scopes':[{'disease':d,'barangay':b,'history':[0]*45} for d in DISEASES for b in BARANGAYS]}
(folder/'input.json').write_text(json.dumps(data))
result=subprocess.run([sys.executable,'-X','utf8','-B',str(runtime/'monthly-runner.py'),str(folder/'input.json'),str(folder/'output.json'),str(folder/'progress.json'),digest(manifest)],env=os.environ.copy(),capture_output=True,text=True,timeout=600)
if result.returncode:
 print('FAIL',result.stderr[-2000:]);sys.exit(1)
output=json.loads((folder/'output.json').read_text())
assert len(output['scopes'])==70
assert all(len(s['outputs'])==15 for s in output['scopes'])
assert output['input_sha256']==digest(data)
assert json.loads((folder/'progress.json').read_text())['state']=='complete'
print('PASS real worker: 70 QA scopes x45 zero months, 1050 outputs, prefix hashes and complete progress. No publication. Folder:',folder)
