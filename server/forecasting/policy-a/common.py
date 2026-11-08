from pathlib import Path
import csv,datetime,hashlib,json,os,time
ROOT=Path(__file__).resolve().parent
DISEASES=['Cough','URTI','Infection all types','ARI','Fever unknown origin','Hypertension','Influenza','Acute Gastroenteritis','Vertigo','All types of skin disease']
BARANGAYS=['Salvacion','Alegria','Blumentritt','Caliban','Cansilayan','Sta. Rosa','Minoyan']
VALIDATION='Real-world Validation Pending'
SOURCE=ROOT/'data/SYNTHETIC_RANDOM_BALANCED5500_monthly.csv'
for k in ['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS','NUMBA_NUM_THREADS']:os.environ[k]='1'
os.environ['MPLCONFIGDIR']=str(ROOT/'runtime/mpl');os.environ['PYTHONDONTWRITEBYTECODE']='1'
def read(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def put(p,v):
    p=Path(p);p.parent.mkdir(exist_ok=True,parents=True);tmp=p.with_suffix(p.suffix+'.tmp')
    with tmp.open('w',encoding='utf-8') as f:json.dump(v,f,indent=2,allow_nan=False);f.flush();os.fsync(f.fileno())
    # Windows readers/scanners may briefly hold a handle without delete sharing.
    # Retain the flushed temporary file, retry boundedly, then fail explicitly.
    for attempt in range(51):
        try:
            os.replace(tmp,p)
            break
        except PermissionError:
            if attempt==50:raise
            time.sleep(.1)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def digest(v):return hashlib.sha256(json.dumps(v,separators=(',',':')).encode()).hexdigest()
def month(i):return f'{2023+i//12:04}-{i%12+1:02}'
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def csv_write(p,rows,fields=None):
    rows=list(rows);p=Path(p);p.parent.mkdir(parents=True,exist_ok=True)
    with p.open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=fields or list(rows[0]),lineterminator='\n');w.writeheader();w.writerows(rows)
