"""Unchanged frozen CMP functions, extracted from the verified research sources."""
import math
import numpy as np
from scipy.optimize import brentq, minimize_scalar
from scipy.special import gammaln, logsumexp

def raw(theta,nu):
 for K in [128,256,512,1024,2048,4096,8192]:
  k=np.arange(K+1);lw=k*theta-nu*gammaln(k+1);z=logsumexp(lw);p=np.exp(lw-z)
  lr=theta-nu*math.log(K+1)
  if lr<0:
   q=math.exp(lr);tail=p[-1]*q/(1-q);moment=p[-1]*q*((K+1)/(1-q)+q/(1-q)**2)
   if tail<1e-13 and moment<1e-11:return k,p,lw-z,tail,moment
 raise ValueError('tail bound failed')
def dist(mu,nu):
 if not math.isfinite(mu) or mu<0 or not math.isfinite(nu) or nu<=0:raise ValueError('invalid parameters')
 if mu==0:return np.arange(129),np.r_[1.,np.zeros(128)],np.r_[0.,np.full(128,-np.inf)],0.,0.,None
 def f(t):
  k,p,_,_,_=raw(t,nu);return np.dot(k,p)-mu
 lo=-16.;hi=nu*math.log(mu+2)
 while f(lo)>0 and abs(lo)<65536:lo*=2
 while f(hi)<0 and hi<65536:hi*=2
 t=brentq(f,lo,hi,xtol=1e-11);k,p,lp,tail,moment=raw(t,nu)
 assert abs(sum(p)-1)<1e-12 and abs(np.dot(k,p)-mu)<1e-8*(1+mu)
 return k,p,lp,tail,moment,t

def conditional_fit(pairs):
    informative=[p for p in pairs if p['mu']>0]
    if any(p['mu']==0 and p['y']>0 for p in pairs):return dict(status='zero_mean_positive_training_outcome',nu=None)
    if len(informative)<28 or len({p['j'] for p in informative})<5 or len({p['barangay'] for p in informative})<5:
        return dict(status='insufficient_prior_prediction_pairs',nu=None,pairs=len(informative))
    # Each mean is fixed to a strictly earlier SARIMA prediction.
    def objective(x):
        nu=math.exp(x)
        return -sum(float(CMP.dist(p['mu'],nu)[2][p['y']]) for p in informative)
    lo,hi=math.log(.05),math.log(100)
    opt=minimize_scalar(objective,bounds=(lo,hi),method='bounded',options={'xatol':1e-7})
    x=float(opt.x);e=1e-4;v=objective(x);a,b=objective(x-e),objective(x+e);m=len(informative)
    grad=(b-a)/(2*e*m);curv=(b-2*v+a)/(e*e*m)
    status='ok'
    if not opt.success:status='optimizer_failed'
    elif min(x-lo,hi-x)<.0001:status='boundary_optimum'
    elif not all(math.isfinite(z) for z in [v,grad,curv]) or abs(grad)>.001 or curv< -1e-5:status='optimality_failed'
    return dict(status=status,nu=math.exp(x),gradient=grad,curvature=curv,nll=v/m,pairs=m,origins=len({p['j'] for p in informative}),barangays=len({p['barangay'] for p in informative}),evaluations=int(opt.nfev))

