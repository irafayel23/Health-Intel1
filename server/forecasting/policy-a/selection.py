"""Frozen selection hierarchies: no outer target used in model ranking."""
from common import *
P=read(ROOT/'policy.json')

def select(n,values,get,variant):
    logs=[];eligible=[];current_valid=[]
    for c in range(len(P['variants'][variant]['candidate_templates'])):
        current=get(n,c)
        if not current['usable']:
            logs.append({'template':c,'eligible':False,'stage':'current','reason':current['reason'],'failure_stage':current.get('stage')});continue
        current_valid.append({'template':c,'current':current})
        inner=[get(t,c) for t in range(n-3,n)]
        missing=[{'prefix':t,'stage':r.get('stage'),'reason':r['reason']} for t,r in zip(range(n-3,n),inner) if not r['usable']]
        if missing:
            logs.append({'template':c,'eligible':False,'stage':'inner','reason':'one_or_more_inner_SARIMA_fits_unavailable','missing_inner':missing});continue
        errors=[abs(values[t]-r['prediction']) for t,r in zip(range(n-3,n),inner)]
        eligible.append({'template':c,'inner_MAE':sum(errors)/3,'inner_errors':errors,'current':current})
    if not eligible:
        if variant=='bugfix' or not current_valid:
            return dict(usable=False,prediction=None,raw_prediction=None,lower=None,upper=None,actual_model='SARIMA forecast unavailable',stage='selection',reason='No candidate passed current and all three training-only inner fits' if current_valid else 'No current candidate passed registered eligibility, numerical and residual checks',selection_log=logs,current_usable=len(current_valid),variant=variant)
        groups={tuple(x['current']['comparison_key']) for x in current_valid}
        if len(groups)!=1:return dict(usable=False,prediction=None,raw_prediction=None,lower=None,upper=None,actual_model='SARIMA forecast unavailable',stage='selection',reason='Incompatible current likelihood groups without matched inner validation',selection_log=logs,variant=variant)
        chosen=min(current_valid,key=lambda x:(x['current']['aicc_effective'],x['current']['k'],x['template']))
        return {**chosen['current'],'selection_status':'training_AICc_inner_validation_unavailable','selection_reason':'Current training-only compatible AICc; no candidate had all three inner forecasts. Weaker selection evidence.','inner_MAE':None,'inner_targets':[],'selection_log':logs,'current_usable':len(current_valid),'complete_inner_candidates':0}
    best=min(x['inner_MAE'] for x in eligible);close=[x for x in eligible if x['inner_MAE']<=best+max(1e-12,.05*best)];group={}
    for row in close:group.setdefault(tuple(row['current']['comparison_key']),[]).append(row)
    def rank(row):
        r=row['current']
        return (r['k'],r['aicc_effective'],row['template']) if variant=='bugfix' else (r['aicc_effective'],r['k'],row['template'])
    winners=[min(rows,key=rank) for rows in group.values()];chosen=min(winners,key=lambda x:(x['inner_MAE'],x['current']['k'],x['template']))
    return {**chosen['current'],'selection_status':'matched_three_inner_targets','selection_reason':'Matched three training-only one-step targets; 5% MAE band; '+('k then compatible AICc' if variant=='bugfix' else 'compatible AICc then k'),'inner_MAE':chosen['inner_MAE'],'inner_targets':[{'index':t,'prefix_digest':digest(values[:t]),'actual':values[t]} for t in range(n-3,n)],'selection_log':logs+[{'template':x['template'],'eligible':True,'inner_MAE':x['inner_MAE'],'inner_errors':x['inner_errors']} for x in eligible],'current_usable':len(current_valid),'complete_inner_candidates':len(eligible)}
