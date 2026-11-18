"""Predeclared B and C genuine-SARIMA candidates; no output fallback model."""
from common import *
import numpy as np,math,warnings,traceback,contextlib,io
from functools import lru_cache
from differencing import decision
P=read(ROOT/'policy.json')
METHODS=[f'{v}{i}' for v in ['bugfix','optimized'] for i in range(len(P['variants'][v]['candidate_templates']))]

def clean(value):
    if isinstance(value,dict):return {str(k):clean(v) for k,v in value.items()}
    if isinstance(value,(list,tuple,np.ndarray)):return [clean(v) for v in value]
    if isinstance(value,(np.floating,float)):return float(value) if math.isfinite(float(value)) else None
    if isinstance(value,np.integer):return int(value)
    if isinstance(value,np.bool_):return bool(value)
    return value

@lru_cache(maxsize=256)
def seasonal_evidence(values):
    from scipy.stats import f
    a=np.asarray(values,float);n=len(a);out={'supported':False,'n':n,'grade':'weak_or_uncertain'}
    if n<24 or np.std(a)==0:return out
    t=np.arange(n);x=np.column_stack([np.ones(n),t]);z=np.column_stack([x,np.sin(2*np.pi*t/12),np.cos(2*np.pi*t/12)])
    r=a-x@np.linalg.lstsq(x,a,rcond=None)[0];e=a-z@np.linalg.lstsq(z,a,rcond=None)[0];s0=float(r@r);s1=float(e@e)
    strength=max(0.,1-s1/s0) if s0>1e-20 else 0.
    prob=float(f.sf(max(0.,(s0-s1)/2)/(s1/(n-4)),2,n-4)) if s1>1e-20 else 0.
    corr=float(np.corrcoef(r[:-12],r[12:])[0,1]) if np.std(r[:-12])>0 and np.std(r[12:])>0 else 0.
    supported=bool(prob<P['harmonic_alpha'] and strength>=P['minimum_harmonic_strength'] and corr>P['minimum_lag12_correlation'])
    profile=[float(np.mean(r[t%12==m])) for m in range(12)]
    profile_error=r-np.asarray([profile[i%12] for i in range(n)])
    years=[]
    for start in range(0,n-11,12):
        y=a[start:start+12];tt=np.arange(12);zz=np.column_stack([np.ones(12),np.sin(2*np.pi*tt/12),np.cos(2*np.pi*tt/12)])
        b=np.linalg.lstsq(zz,y,rcond=None)[0];years.append({'year':2023+start//12,'amplitude':float(np.hypot(b[1],b[2])),'phase_radians':float(np.arctan2(b[2],b[1]))})
    return clean(dict(supported=supported,n=n,grade='supported' if supported else 'weak_or_uncertain',harmonic_pvalue=prob,strength=strength,lag12_correlation=corr,lag12_pairs=n-12,month_profile=profile,month_profile_explained_fraction=max(0.,1-float(profile_error@profile_error)/s0) if s0>1e-20 else None,full_year_harmonics=years,training_seasonal_naive_MAE=float(np.mean(np.abs(a[12:]-a[:-12]))),training_naive_same_targets_MAE=float(np.mean(np.abs(a[12:]-a[11:-1]))),interpretation='Exploratory training-only seasonal evidence; no proof of clinical seasonality'))

def unavailable(stage,reason,**kw):
    return dict(usable=False,prediction=None,raw_prediction=None,lower=None,upper=None,actual_model='SARIMA forecast unavailable',stage=stage,reason=reason,**kw)

def candidate(values,index,variant='optimized'):
    stage='input_validation';detail={'variant':variant,'template':index,'input_n':len(values),'numerically_valid':False,'diagnostic_status':'not_evaluated'}
    try:
        a=np.asarray(values,float)
        if a.ndim!=1 or not np.isfinite(a).all() or (a<0).any() or (a%1).any():raise ValueError('Invalid monthly sequence')
        if variant not in P['variants'] or not 0<=index<len(P['variants'][variant]['candidate_templates']):raise ValueError('Unapproved SARIMA template')
        stage='eligibility';ann=seasonal_evidence(tuple(values));detail.update(annual=ann,seasonal_evidence_grade=ann['grade'],nonzero_count=int(np.count_nonzero(a)),nonzero_fraction=float(np.count_nonzero(a)/len(a)) if len(a) else 0.)
        if len(a)<P['minimum_fit_months']:return unavailable(stage,'insufficient_history',**detail)
        if np.std(a)==0:return unavailable(stage,'constant_history_does_not_support_seasonal_fit',**detail)
        if np.count_nonzero(a)<max(6,math.ceil(P['minimum_nonzero_fraction']*len(a))):return unavailable(stage,'sparse_history',**detail)
        if P['variants'][variant]['annual_gate'] and not ann['supported']:return unavailable(stage,'annual_pattern_not_supported_by_training_screen',**detail)
        diff=decision(tuple(values));detail['differencing_tests']=diff
        if not diff['usable']:return unavailable(diff['stage'],diff['reason'],traceback=diff.get('traceback'),**detail)
        return fit_spec(values,index,variant,diff,ann)
    except Exception as e:return unavailable(stage,type(e).__name__+': '+str(e),traceback=traceback.format_exc(),**detail)

def fit_spec(values,index,variant,diff,ann):
    """Explicit specification fitting, also used for native regression parity tests."""
    import pmdarima as pm
    from statsmodels.stats.diagnostic import acorr_ljungbox
    a=np.asarray(values,float);d,D=int(diff['d']),int(diff['D']);p,q,SP,SQ=P['variants'][variant]['candidate_templates'][index]
    order=(p,d,q);seas=(SP,D,SQ,12);assert SP+SQ>=1
    detail=dict(variant=variant,template=index,input_n=len(a),order=list(order),seasonal_order=list(seas),annual=ann,seasonal_evidence_grade=ann['grade'],differencing_tests=diff,numerically_valid=False,diagnostic_status='not_evaluated')
    stage='native_fit';caught=[]
    try:
        with warnings.catch_warnings(record=True) as caught,contextlib.redirect_stdout(io.StringIO()):
            warnings.simplefilter('always')
            fitted=pm.ARIMA(order=order,seasonal_order=seas,with_intercept=d+D==0,method='lbfgs',maxiter=P['maxiter'],suppress_warnings=False,enforce_stationarity=True,enforce_invertibility=True).fit(a)
            r=fitted.arima_res_;k=float(r.df_model);n=float(r.nobs_effective)
            detail.update(native_fit_completed=True,converged=bool(r.mle_retvals.get('converged',False)),k=k,nobs_effective=n,burn=int(r.loglikelihood_burn),llf=float(r.llf),params=dict(zip(r.param_names,map(float,r.params))),standard_errors=dict(zip(r.param_names,map(float,r.bse))),optimizer=clean(r.mle_retvals))
            stage='convergence'
            if not detail['converged']:raise ValueError('optimizer_did_not_converge')
            stage='parameter_validity'
            if not np.isfinite(r.params).all() or not np.isfinite(r.llf):raise ValueError('nonfinite_parameters_or_likelihood')
            stage='effective_history'
            if n<max(P['minimum_effective_observations'],P['minimum_observations_per_parameter']*k) or n<=k+1:raise ValueError('insufficient_effective_observations_per_parameter')
            stage='information_criterion';manual=float(-2*r.llf+2*k+2*k*(k+1)/(n-k-1));pmmanual=float(-2*r.llf+2*k+2*k*(k+1)/(len(a)-k-1))
            if not np.isclose(manual,r.aicc) or not np.isclose(pmmanual,fitted.aicc()):raise ValueError('AICc_arithmetic_disagreement')
            detail.update(aicc_effective=float(r.aicc),manual_aicc_effective=manual,pmdarima_aicc=float(fitted.aicc()),manual_pmdarima_aicc=pmmanual,comparison_key=[d,D,n,int(r.loglikelihood_burn)])
            stage='roots';roots=np.abs(np.r_[r.arroots,r.maroots]);finite=roots[np.isfinite(roots)]
            detail.update(root_moduli=clean(roots),minimum_finite_root=float(finite.min()) if len(finite) else None,infinite_roots=int(np.isinf(roots).sum()))
            if np.isnan(roots).any() or (len(finite) and finite.min()<=P['minimum_root_modulus']):raise ValueError('unstable_or_boundary_roots')
            stage='covariance';cov=np.asarray(r.cov_params());cond=float(np.linalg.cond(cov));detail['covariance_condition']=cond if np.isfinite(cond) else None
            if not np.isfinite(cov).all() or not np.isfinite(r.bse).all() or cond>P['maximum_covariance_condition']:raise ValueError('unstable_covariance')
            detail['numerically_valid']=True
            stage='residuals';residual=np.asarray(r.filter_results.standardized_forecasts_error[0])[max(int(r.loglikelihood_burn),int(r.nobs_diffuse)):]
            detail.update(standardized_innovations=clean(residual),residual_n=len(residual),residual_mean=float(np.mean(residual)),model_df=p+q+SP+SQ)
            df=p+q+SP+SQ;lags=[lag for lag in [min(10,len(residual)//5),12] if lag>df and len(residual)>=2*lag];diagnostics=[]
            for lag in sorted(set(lags)):
                pv=float(acorr_ljungbox(residual,lags=[lag],model_df=df,return_df=True)['lb_pvalue'].iloc[0]);diagnostics.append({'lag':lag,'adjusted_df':lag-df,'pvalue':pv if np.isfinite(pv) else None})
            detail.update(ljung_box=diagnostics,annual_residual_test_evaluable=any(x['lag']==12 for x in diagnostics))
            if not np.isfinite(residual).all() or not diagnostics or any(x['pvalue'] is None or x['pvalue']<P['severe_residual_alpha'] for x in diagnostics):
                detail['diagnostic_status']='residual_model_problem';raise ValueError('residual_autocorrelation_screen_failed')
            detail['diagnostic_status']='passed_registered_residual_checks'
            stage='forecast';prediction,bounds=fitted.predict(2,return_conf_int=True,alpha=.05);raw=float(prediction[0]);lo,hi=map(float,bounds[0])
            if not np.isfinite(np.r_[prediction,np.asarray(bounds).ravel()]).all() or any(float(b[0])>float(b[1]) for b in bounds):raise ValueError('invalid_forecast_or_interval')
            seasonal_params={name:float(v) for name,v in zip(r.param_names,r.params) if '.S.' in name}
            assert seasonal_params,'No estimated seasonal AR/MA parameter'
            detail['forecast_steps']=[{'horizon':h+1,'raw_prediction':float(prediction[h]),'prediction':max(0.,float(prediction[h])),'lower':max(0.,float(bounds[h][0])),'upper':max(0.,float(bounds[h][1]))} for h in range(2)]
            detail.update(estimated_seasonal_parameters=seasonal_params,raw_prediction=raw,prediction=max(0.,raw),lower=max(0.,lo),upper=max(0.,hi),interval_method='Nominal 95% Gaussian interval clipped at zero; model-selection uncertainty omitted; not accuracy')
        detail['warnings']=[str(w.message) for w in caught]
        return clean(dict(usable=True,actual_model='SARIMA',stage='complete',reason='Registered numerical and residual checks passed',**detail))
    except Exception as e:
        detail['warnings']=[str(w.message) for w in caught]
        return clean(unavailable(stage,type(e).__name__+': '+str(e),traceback=traceback.format_exc(),**{k:v for k,v in detail.items() if k not in ['prediction','raw_prediction','lower','upper']}))

def predict(method,values):
    if method not in METHODS:raise ValueError('Unapproved model request')
    variant='bugfix' if method.startswith('bugfix') else 'optimized'
    return candidate(values,int(method[len(variant):]),variant)
