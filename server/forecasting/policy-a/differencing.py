"""Versioned cap-safe OCSB adapter; never edits installed pmdarima."""
from functools import lru_cache
import warnings,traceback
import numpy as np
from pmdarima.arima import ndiffs
from pmdarima.arima.seasonality import OCSBTest
ADAPTER_VERSION='OCSB-maxD1-first-decision-1'

def capped_ocsb(values,max_D=1):
    if max_D!=1:raise ValueError('This audited adapter supports max_D=1 only')
    a=np.asarray(values,dtype=float)
    if a.ndim!=1 or not len(a) or not np.isfinite(a).all():raise ValueError('Invalid OCSB prefix')
    if np.ptp(a)==0:return 0,{'constant':True,'first_decision':0,'cap_reached':False}
    first=int(OCSBTest(m=12,lag_method='aic',max_lag=3).estimate_seasonal_differencing_term(a))
    if first not in (0,1):raise ValueError('Unexpected OCSB decision')
    return first,{'first_decision':first,'cap_reached':first==1,'second_test_skipped_at_cap':first==1,'lag_method':'aic','max_lag':3}

@lru_cache(maxsize=256)
def decision(values):
    a=np.asarray(values,float);stage='seasonal_differencing';evidence={'adapter_version':ADAPTER_VERSION,'input_n':len(a)}
    caught=[]
    try:
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always')
            D,meta=capped_ocsb(a);evidence.update(OCSB_D=D,OCSB=meta)
            adjusted=a[12:]-a[:-12] if D else a.copy()
            evidence.update(ordinary_test_input_n=len(adjusted),ordinary_test_after_seasonal_difference=bool(D))
            stage='ordinary_differencing';d=int(ndiffs(adjusted,test='kpss',alpha=.05,max_d=1));evidence['KPSS_d']=d
            # Diagnostic only: never used to replace the operative d decision.
            stage='raw_KPSS_diagnostic';evidence['raw_KPSS_d']=int(ndiffs(a,test='kpss',alpha=.05,max_d=1))
        return dict(usable=True,d=d,D=D,evidence=evidence,warnings=[str(w.message) for w in caught])
    except Exception as e:
        return dict(usable=False,stage=stage,reason=type(e).__name__+': '+str(e),traceback=traceback.format_exc(),evidence=evidence,warnings=[str(w.message) for w in caught])
