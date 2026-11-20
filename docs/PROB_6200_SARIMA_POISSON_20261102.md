# SARIMA + Poisson: 6,200-case isolated probability audit

**Decision: mathematics PASS; calibrated probability display NOT READY. Further isolated probability-model research is justified, not application integration.**

CODEX-1, 2 November 2026. No fitting, application, dataset, database or Azure changes. The installed bundle is already 6,200 cases; the older 5,592-case bundle is preserved. This corrects the outdated installed-dataset premise in the request.

## Inputs and protocol
Verified 3150 unique monthly cells, 70 histories × 45 months, 6,200 cases, January 2023–September 2026; zero-case cells: 0. Dataset SHA-256: `49b4ca92eff35bc574b61f46cde982a35b4d843b84d71228158e1941829c84e7`.
SARIMA remains unchanged. Saved accepted predictions are reused; every training-prefix digest and CSV/history cell reconciled. Primary36/9 and separate31/14 expanding one-month-ahead protocols; earlier test observations become training only after their month. Their overlapping targets are not independent replications. Historical targets were inspected previously: all evidence is exploratory. No data regeneration or tuning.
Baseline rate is each origin’s prior-history arithmetic mean. Primary probabilities available626/630; secondary973/980; both October methods70/70. Baseline is mathematically available on all630/980, but comparison scores use only identical626/973 SARIMA-available targets. Missing targets retained in missing-targets.csv. Four primary misses are Influenza/Caliban; no substitution.

## Definitions fixed before scoring
λ=max(0, saved finite SARIMA prediction); N=floor(λ+0.5). Never use rounded N as the rate. Invalid/rejected fits stay unavailable. Negative accepted rates would be explicitly clamped and counted; none occurred. λ=0 assigns P(0)=1 and P(Y≥1)=0; a positive observation then gets infinite negative log score. No epsilon clipping. These boundary cases passed fixtures.
P(Y=k)=exp(-λ)λ^k/k!; nearby probability = F(N+1)−F(max(0,N−1)−1); positive probability=1−exp(-λ). λ=4 gives exact4=19.536681%, nearby3–5=54.703%; positive=98.168436%. For positive count4, probability cannot be100%; λ=0 is legitimately degenerate at0.
Brier=(p−1[event])². Both methods scored on the same SARIMA-defined exact-count and nearby events, preventing a different-event comparison. NLL=−ln P(Y=observed), natural logs, lower better. RPS=Σk≥0(F(k)−1[observed≤k])², unnormalized and lower better. RPS checked independently against E|X−y|−½E|X−X′| for every scored target. Central80%/95% ranges use Poisson quantiles; discrete ranges may contain more than nominal probability. Their actual assigned mass is reported.
The historical SARIMA within-tolerance rule stays |prediction−actual|≤max(1,.2actual). It is separate from exact probability, nearby probability, and interval coverage.

## Matched-target probability scores
|Protocol|Method|N|Exact Brier|NLL|RPS|
|---|---|---:|---:|---:|---:|
|80_20|SARIMA-Poisson|626|0.337006|1.339526|0.412512|
|80_20|Mean-Poisson|626|0.344647|1.347421|0.418816|
|31_14|SARIMA-Poisson|973|0.339110|1.335746|0.408400|
|31_14|Mean-Poisson|973|0.346457|1.338821|0.409855|

SARIMA–Poisson slightly improves these pooled scores against mean-Poisson, but both distributions are misspecified. A small relative gain does not establish calibrated probabilities. No formal significance claim is made: targets overlap over time and scopes share generated patterns.

## Calibration and ranges
- 80_20: mean exact probability 28.73%, observed exact-count rate 61.98%; mean nearby probability 74.79%, observed nearby frequency 95.53%.
- 80_20: central80% range coverage 99.20% vs assigned discrete mass 93.58%; central95% coverage 100.00% vs assigned mass 98.54%. Mean widths 3.58/4.90 cases.
- 80_20: per-scope lower NLL AND RPS: 33; both worse: 35; mixed/tied: 2. This is descriptive, not proof of improvement in each scope.
- 31_14: mean exact probability 28.61%, observed exact-count rate 61.97%; mean nearby probability 74.57%, observed nearby frequency 95.99%.
- 31_14: central80% range coverage 99.38% vs assigned discrete mass 93.48%; central95% coverage 100.00% vs assigned mass 98.51%. Mean widths 3.58/4.91 cases.
- 31_14: per-scope lower NLL AND RPS: 31; both worse: 37; mixed/tied: 2. This is descriptive, not proof of improvement in each scope.

Fixed exact-probability calibration bins (no fitted recalibration):
|Protocol|Method|Probability bin|N|Mean assigned|Observed exact|
|---|---|---|---:|---:|---:|
|80_20|SARIMA-Poisson|0.1-0.2|56|18.57%|32.14%|
|80_20|SARIMA-Poisson|0.2-0.3|359|26.35%|62.12%|
|80_20|SARIMA-Poisson|0.3-0.4|211|35.48%|69.67%|
|80_20|Mean-Poisson|0.1-0.2|75|17.88%|28.00%|
|80_20|Mean-Poisson|0.2-0.3|372|26.63%|64.78%|
|80_20|Mean-Poisson|0.3-0.4|179|33.16%|70.39%|
|31_14|SARIMA-Poisson|0.1-0.2|91|18.66%|35.16%|
|31_14|SARIMA-Poisson|0.2-0.3|571|26.37%|62.00%|
|31_14|SARIMA-Poisson|0.3-0.4|310|35.50%|70.00%|
|31_14|SARIMA-Poisson|0.7-0.8|1|76.82%|0.00%|
|31_14|Mean-Poisson|0.1-0.2|120|17.90%|30.00%|
|31_14|Mean-Poisson|0.2-0.3|599|26.62%|64.61%|
|31_14|Mean-Poisson|0.3-0.4|254|33.05%|70.87%|

## Training-only Poisson suitability
- First36 months,70 histories: median sample variance/mean=0.3853, range=0.1872–0.7624; 70/70 below1. Observed training zeros=0%; mean training-mean-Poisson zero probability=16.47%.
- First31 months,70 histories: median sample variance/mean=0.4120, range=0.1431–0.8933; 70/70 below1. Observed training zeros=0%; mean training-mean-Poisson zero probability=16.12%.
Poisson imposes conditional variance equal to its mean and permits zeros. These deliberately positive, relatively smooth synthetic histories are often underdispersed. Raw training variance/mean is only a descriptive screen, not a conditional dispersion test; seasonality and serial dependence matter. The large out-of-sample calibration gaps independently show that the plug-in distribution spreads too much probability away from the observed counts. Treating a SARIMA point forecast as a Poisson rate is an additional assumption, not a consequence of fitting SARIMA. SARIMA estimation uncertainty is also omitted by this plug-in approach.
All observed months are positive. Positive-event Brier can be computed, but there are no negative events to test discrimination, false-positive behavior or credible probability calibration across zero/positive outcomes. Predicting positive with probability1 would trivially score perfectly here and is not a validated operational model.

## October2026: Cough / Salvacion
Unrounded SARIMA mean **3.785266178108**, displayed count **4**. Exact4: **19.420224%**. Range3–5: **54.644279%**. At least1: **97.729718%**. These are calculated Poisson assumptions, not verified chances of this month occurring. October has no observed target in this evidence and cannot be scored.

## Recommendation
Keep the installed SARIMA unchanged. Do not integrate these as trusted chances or label them prediction accuracy. If shown in a separate research preview, label “Experimental Poisson probability; not calibrated” and state the event explicitly. Further controlled distributional research may investigate underdispersion or support restrictions, but must preregister assumptions before scoring and use genuinely uninspected complete monthly observations for confirmation. Do not remove possible zeros solely because this scenario excludes them. No guarantee of higher accuracy.

## All70 combinations, both protocols
Scores below compare matched targets; exact Brier uses the same SARIMA-defined event for both methods. Full row probabilities, actuals, scores, ranges and training diagnostics are in accompanying CSV/JSON.
|Protocol|Disease|Barangay|N|SARIMA NLL|Mean NLL|SARIMA RPS|Mean RPS|SARIMA Brier|Mean Brier|Comparison|
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
|80_20|Cough|Salvacion|9|1.6984|1.6890|0.5793|0.5635|0.4448|0.4507|worse|
|80_20|Cough|Alegria|9|1.8300|1.8164|0.6992|0.6793|0.2416|0.2423|worse|
|80_20|Cough|Blumentritt|9|1.7341|1.8318|0.6346|0.7883|0.1712|0.1720|better|
|80_20|Cough|Caliban|9|1.9750|2.0516|0.8881|1.0183|0.1721|0.1680|better|
|80_20|Cough|Cansilayan|9|2.0982|1.9082|1.0898|0.8676|0.2320|0.2391|worse|
|80_20|Cough|Sta. Rosa|9|2.0829|2.0460|1.0296|0.9844|0.0346|0.0313|worse|
|80_20|Cough|Minoyan|9|1.7371|1.7306|0.6421|0.6317|0.3771|0.3772|worse|
|80_20|URTI|Salvacion|9|1.5011|1.4562|0.5048|0.4502|0.2151|0.2199|worse|
|80_20|URTI|Alegria|9|1.3323|1.3078|0.3873|0.3642|0.2965|0.2961|worse|
|80_20|URTI|Blumentritt|9|1.3132|1.2794|0.4344|0.4036|0.3207|0.3181|worse|
|80_20|URTI|Caliban|9|1.4136|1.4317|0.4962|0.5099|0.3035|0.3130|better|
|80_20|URTI|Cansilayan|9|1.3069|1.3070|0.3111|0.3109|0.5319|0.5320|mixed_or_tied|
|80_20|URTI|Sta. Rosa|9|1.1089|1.1598|0.2867|0.3304|0.3473|0.3774|better|
|80_20|URTI|Minoyan|9|1.3325|1.3160|0.3659|0.3496|0.3848|0.3868|worse|
|80_20|Infection all types|Salvacion|9|1.3622|1.3478|0.4267|0.4103|0.3310|0.3284|worse|
|80_20|Infection all types|Alegria|9|1.3934|1.3557|0.4158|0.3738|0.3311|0.3238|worse|
|80_20|Infection all types|Blumentritt|9|1.3701|1.2727|0.4863|0.4020|0.1762|0.1741|worse|
|80_20|Infection all types|Caliban|9|1.2634|1.3038|0.3722|0.4098|0.3393|0.3532|better|
|80_20|Infection all types|Cansilayan|9|1.2082|1.2393|0.3237|0.3509|0.3400|0.3597|better|
|80_20|Infection all types|Sta. Rosa|9|1.2060|1.1998|0.3585|0.3503|0.1679|0.1694|worse|
|80_20|Infection all types|Minoyan|9|1.1924|1.1848|0.3273|0.3218|0.3786|0.3862|worse|
|80_20|ARI|Salvacion|9|1.2027|1.2672|0.2955|0.3585|0.4408|0.4690|better|
|80_20|ARI|Alegria|9|1.2326|1.2601|0.3257|0.3526|0.3984|0.4176|better|
|80_20|ARI|Blumentritt|9|1.1909|1.2237|0.3106|0.3405|0.3285|0.3440|better|
|80_20|ARI|Caliban|9|1.2269|1.2811|0.3186|0.3707|0.3165|0.3277|better|
|80_20|ARI|Cansilayan|9|1.3176|1.3381|0.4494|0.4634|0.3054|0.3057|better|
|80_20|ARI|Sta. Rosa|9|1.2612|1.2799|0.3330|0.3522|0.3640|0.3761|better|
|80_20|ARI|Minoyan|9|1.3979|1.4336|0.4415|0.4764|0.3798|0.3790|better|
|80_20|Fever unknown origin|Salvacion|9|1.2849|1.3038|0.3994|0.4095|0.3236|0.3430|better|
|80_20|Fever unknown origin|Alegria|9|1.2646|1.2553|0.3755|0.3655|0.2802|0.2787|worse|
|80_20|Fever unknown origin|Blumentritt|9|1.2212|1.2139|0.3736|0.3639|0.1704|0.1699|worse|
|80_20|Fever unknown origin|Caliban|9|1.3655|1.3536|0.4081|0.3980|0.3793|0.3817|worse|
|80_20|Fever unknown origin|Cansilayan|9|1.0374|1.0955|0.2383|0.2875|0.3731|0.4004|better|
|80_20|Fever unknown origin|Sta. Rosa|9|1.2976|1.2620|0.3884|0.3533|0.2842|0.2822|worse|
|80_20|Fever unknown origin|Minoyan|9|1.2307|1.2535|0.3811|0.4029|0.2160|0.2216|better|
|80_20|Hypertension|Salvacion|9|1.1493|1.1750|0.3108|0.3267|0.3504|0.3832|better|
|80_20|Hypertension|Alegria|9|1.1585|1.1696|0.3123|0.3228|0.3661|0.3806|better|
|80_20|Hypertension|Blumentritt|9|1.3181|1.3177|0.3269|0.3275|0.5363|0.5362|mixed_or_tied|
|80_20|Hypertension|Caliban|9|1.2883|1.2854|0.3583|0.3551|0.3332|0.3317|worse|
|80_20|Hypertension|Cansilayan|9|1.3425|1.3604|0.3555|0.3782|0.4937|0.5031|better|
|80_20|Hypertension|Sta. Rosa|9|1.2947|1.2968|0.3454|0.3456|0.4270|0.4298|better|
|80_20|Hypertension|Minoyan|9|1.1525|1.1512|0.3077|0.3066|0.3216|0.3219|worse|
|80_20|Influenza|Salvacion|9|1.1554|1.2519|0.2930|0.3822|0.3691|0.4124|better|
|80_20|Influenza|Alegria|9|1.1617|1.2307|0.2780|0.3448|0.4694|0.4994|better|
|80_20|Influenza|Blumentritt|9|1.2139|1.2772|0.3080|0.3672|0.4340|0.4630|better|
|80_20|Influenza|Caliban|5|1.2102|1.5112|0.3040|0.6176|0.3610|0.4107|better|
|80_20|Influenza|Cansilayan|9|1.2274|1.2772|0.3245|0.3672|0.3794|0.4134|better|
|80_20|Influenza|Sta. Rosa|9|1.3668|1.6419|0.4633|0.6976|0.3108|0.3197|better|
|80_20|Influenza|Minoyan|9|1.2488|1.2571|0.3445|0.3509|0.3505|0.3678|better|
|80_20|Acute Gastroenteritis|Salvacion|9|1.1785|1.1441|0.3272|0.3006|0.3503|0.3695|worse|
|80_20|Acute Gastroenteritis|Alegria|9|1.1011|1.0923|0.2804|0.2697|0.3420|0.3474|worse|
|80_20|Acute Gastroenteritis|Blumentritt|9|1.3536|1.3827|0.4698|0.4964|0.3604|0.3861|better|
|80_20|Acute Gastroenteritis|Caliban|9|1.2343|1.2644|0.3274|0.3555|0.4005|0.4190|better|
|80_20|Acute Gastroenteritis|Cansilayan|9|1.2506|1.1869|0.4021|0.3382|0.2461|0.2570|worse|
|80_20|Acute Gastroenteritis|Sta. Rosa|9|1.3048|1.2876|0.3765|0.3568|0.3357|0.3310|worse|
|80_20|Acute Gastroenteritis|Minoyan|9|1.3355|1.3207|0.3446|0.3314|0.4894|0.4878|worse|
|80_20|Vertigo|Salvacion|9|1.3601|1.3477|0.3763|0.3638|0.4012|0.3994|worse|
|80_20|Vertigo|Alegria|9|1.3613|1.2943|0.4763|0.4032|0.1838|0.1723|worse|
|80_20|Vertigo|Blumentritt|9|1.3077|1.3069|0.3118|0.3112|0.5322|0.5319|worse|
|80_20|Vertigo|Caliban|9|1.1591|1.1512|0.3150|0.3060|0.2778|0.2816|worse|
|80_20|Vertigo|Cansilayan|9|1.2377|1.2331|0.3678|0.3630|0.2269|0.2264|worse|
|80_20|Vertigo|Sta. Rosa|9|1.3111|1.3131|0.3420|0.3454|0.4867|0.4882|better|
|80_20|Vertigo|Minoyan|9|1.2957|1.2970|0.3479|0.3497|0.4365|0.4373|better|
|80_20|All types of skin disease|Salvacion|9|1.2686|1.2267|0.3827|0.3405|0.1400|0.1335|worse|
|80_20|All types of skin disease|Alegria|9|1.2921|1.3158|0.3615|0.3824|0.3256|0.3241|better|
|80_20|All types of skin disease|Blumentritt|9|1.6680|1.6339|0.6721|0.6308|0.3766|0.3750|worse|
|80_20|All types of skin disease|Caliban|9|1.3428|1.2853|0.4263|0.3546|0.2715|0.2720|worse|
|80_20|All types of skin disease|Cansilayan|9|1.4535|1.4358|0.5151|0.4785|0.3105|0.3175|worse|
|80_20|All types of skin disease|Sta. Rosa|9|1.3172|1.3177|0.3253|0.3275|0.5359|0.5362|better|
|80_20|All types of skin disease|Minoyan|9|1.2968|1.2953|0.3491|0.3446|0.3712|0.3733|worse|
|31_14|Cough|Salvacion|14|1.7868|1.7872|0.6810|0.6837|0.2984|0.3017|better|
|31_14|Cough|Alegria|14|1.7807|1.7661|0.6379|0.6147|0.3434|0.3447|worse|
|31_14|Cough|Blumentritt|14|1.7873|1.8248|0.6916|0.7472|0.1652|0.1661|better|
|31_14|Cough|Caliban|14|1.8467|1.8990|0.7523|0.8403|0.2113|0.2086|better|
|31_14|Cough|Cansilayan|14|2.0382|1.8617|1.0393|0.8180|0.2471|0.2546|worse|
|31_14|Cough|Sta. Rosa|14|1.9356|1.9040|0.8634|0.8218|0.1223|0.1199|worse|
|31_14|Cough|Minoyan|14|1.7391|1.7423|0.6342|0.6392|0.3867|0.3876|better|
|31_14|URTI|Salvacion|14|1.5780|1.5677|0.5667|0.5575|0.2342|0.2445|worse|
|31_14|URTI|Alegria|14|1.2932|1.2757|0.3725|0.3555|0.3036|0.3072|worse|
|31_14|URTI|Blumentritt|14|1.3508|1.2875|0.4615|0.4158|0.3338|0.3327|worse|
|31_14|URTI|Caliban|14|1.3769|1.3901|0.4472|0.4591|0.3550|0.3640|better|
|31_14|URTI|Cansilayan|14|1.3182|1.3070|0.3250|0.3109|0.4979|0.4964|worse|
|31_14|URTI|Sta. Rosa|14|1.1639|1.2114|0.2941|0.3387|0.4066|0.4320|better|
|31_14|URTI|Minoyan|14|1.2983|1.2871|0.3634|0.3513|0.3614|0.3670|worse|
|31_14|Infection all types|Salvacion|14|1.3460|1.3335|0.3896|0.3757|0.4042|0.4012|worse|
|31_14|Infection all types|Alegria|14|1.3918|1.3395|0.4070|0.3522|0.3752|0.3651|worse|
|31_14|Infection all types|Blumentritt|14|1.4031|1.3153|0.4893|0.4104|0.1983|0.2001|worse|
|31_14|Infection all types|Caliban|14|1.2051|1.2658|0.3343|0.3891|0.3442|0.3691|better|
|31_14|Infection all types|Cansilayan|14|1.1615|1.2232|0.3051|0.3627|0.3187|0.3456|better|
|31_14|Infection all types|Sta. Rosa|14|1.2538|1.2356|0.3692|0.3495|0.2674|0.2684|worse|
|31_14|Infection all types|Minoyan|14|1.1795|1.1696|0.3233|0.3146|0.3486|0.3537|worse|
|31_14|ARI|Salvacion|14|1.2425|1.2782|0.3182|0.3534|0.4114|0.4282|better|
|31_14|ARI|Alegria|14|1.2622|1.2880|0.3252|0.3527|0.4473|0.4628|better|
|31_14|ARI|Blumentritt|14|1.2247|1.2412|0.3355|0.3482|0.3253|0.3387|better|
|31_14|ARI|Caliban|14|1.2432|1.2855|0.3303|0.3716|0.3275|0.3351|better|
|31_14|ARI|Cansilayan|14|1.4558|1.4445|0.5587|0.5428|0.2791|0.2772|worse|
|31_14|ARI|Sta. Rosa|14|1.2509|1.2768|0.3263|0.3528|0.3580|0.3673|better|
|31_14|ARI|Minoyan|14|1.3677|1.3920|0.4106|0.4343|0.4015|0.4011|better|
|31_14|Fever unknown origin|Salvacion|14|1.2838|1.2775|0.4013|0.3884|0.3229|0.3422|worse|
|31_14|Fever unknown origin|Alegria|14|1.3224|1.2781|0.3936|0.3525|0.3442|0.3389|worse|
|31_14|Fever unknown origin|Blumentritt|14|1.2451|1.2301|0.3846|0.3683|0.2012|0.2010|worse|
|31_14|Fever unknown origin|Caliban|14|1.3603|1.3338|0.4037|0.3789|0.3731|0.3720|worse|
|31_14|Fever unknown origin|Cansilayan|14|1.0667|1.1233|0.2547|0.3022|0.3716|0.3992|better|
|31_14|Fever unknown origin|Sta. Rosa|14|1.3058|1.2564|0.4102|0.3576|0.2699|0.2716|worse|
|31_14|Fever unknown origin|Minoyan|14|1.2581|1.2733|0.3563|0.3716|0.3289|0.3327|better|
|31_14|Hypertension|Salvacion|14|1.0960|1.1684|0.2755|0.3336|0.3680|0.4141|better|
|31_14|Hypertension|Alegria|14|1.1835|1.1737|0.3393|0.3277|0.3152|0.3277|worse|
|31_14|Hypertension|Blumentritt|14|1.2972|1.2969|0.3467|0.3452|0.3765|0.3727|worse|
|31_14|Hypertension|Caliban|14|1.2983|1.2962|0.3462|0.3443|0.4055|0.4044|worse|
|31_14|Hypertension|Cansilayan|14|1.3957|1.3481|0.4061|0.3790|0.4159|0.4242|worse|
|31_14|Hypertension|Sta. Rosa|14|1.3213|1.2976|0.3726|0.3447|0.4049|0.4018|worse|
|31_14|Hypertension|Minoyan|14|1.1784|1.1725|0.3220|0.3164|0.2955|0.2956|worse|
|31_14|Influenza|Salvacion|14|1.2170|1.2687|0.3221|0.3681|0.3608|0.3866|better|
|31_14|Influenza|Alegria|14|1.1946|1.2434|0.3012|0.3472|0.4529|0.4763|better|
|31_14|Influenza|Blumentritt|14|1.2567|1.2850|0.3347|0.3585|0.4027|0.4192|better|
|31_14|Influenza|Caliban|9|1.2534|1.4232|0.3078|0.4860|0.4371|0.4657|better|
|31_14|Influenza|Cansilayan|12|1.2592|1.2806|0.3552|0.3652|0.3386|0.3630|better|
|31_14|Influenza|Sta. Rosa|14|1.2955|1.4880|0.4022|0.5690|0.3392|0.3536|better|
|31_14|Influenza|Minoyan|14|1.2469|1.2605|0.3388|0.3511|0.3737|0.3916|better|
|31_14|Acute Gastroenteritis|Salvacion|14|1.1245|1.1213|0.2939|0.2908|0.3447|0.3663|worse|
|31_14|Acute Gastroenteritis|Alegria|14|1.0725|1.0815|0.2598|0.2652|0.3661|0.3762|better|
|31_14|Acute Gastroenteritis|Blumentritt|14|1.3087|1.3107|0.4397|0.4392|0.2863|0.3029|mixed_or_tied|
|31_14|Acute Gastroenteritis|Caliban|14|1.2400|1.2677|0.3292|0.3556|0.4075|0.4244|better|
|31_14|Acute Gastroenteritis|Cansilayan|14|1.2582|1.2157|0.3872|0.3431|0.2487|0.2568|worse|
|31_14|Acute Gastroenteritis|Sta. Rosa|14|1.3050|1.2917|0.3667|0.3518|0.3735|0.3704|worse|
|31_14|Acute Gastroenteritis|Minoyan|14|1.2846|1.2964|0.3326|0.3452|0.4307|0.4355|better|
|31_14|Vertigo|Salvacion|14|1.2855|1.2751|0.3642|0.3533|0.3087|0.3090|worse|
|31_14|Vertigo|Alegria|14|1.2870|1.3102|0.4169|0.4358|0.2261|0.2365|better|
|31_14|Vertigo|Blumentritt|14|1.2887|1.3102|0.3219|0.3414|0.4906|0.4996|better|
|31_14|Vertigo|Caliban|14|1.1499|1.1329|0.3193|0.3009|0.2537|0.2579|worse|
|31_14|Vertigo|Cansilayan|14|1.2646|1.2563|0.3654|0.3564|0.2742|0.2723|worse|
|31_14|Vertigo|Sta. Rosa|14|1.3087|1.2975|0.3587|0.3482|0.4398|0.4401|worse|
|31_14|Vertigo|Minoyan|14|1.3027|1.2987|0.3541|0.3502|0.4421|0.4413|worse|
|31_14|All types of skin disease|Salvacion|14|1.2506|1.2236|0.3673|0.3402|0.1777|0.1751|worse|
|31_14|All types of skin disease|Alegria|14|1.3343|1.3178|0.3941|0.3754|0.3401|0.3325|worse|
|31_14|All types of skin disease|Blumentritt|14|1.5426|1.5208|0.5604|0.5337|0.4004|0.3985|worse|
|31_14|All types of skin disease|Caliban|14|1.3087|1.2788|0.4058|0.3784|0.3154|0.2928|worse|
|31_14|All types of skin disease|Cansilayan|14|1.3609|1.3836|0.4586|0.4660|0.2790|0.2937|better|
|31_14|All types of skin disease|Sta. Rosa|14|1.2871|1.2919|0.3509|0.3532|0.4490|0.4629|better|
|31_14|All types of skin disease|Minoyan|14|1.2793|1.2813|0.3703|0.3677|0.3465|0.3573|mixed_or_tied|

## Reproduction and verification
Run `python -B run.py`, then `python -B report.py` using the existing research venv (NumPy/SciPy). No package installation required. Policy/source freeze predates scoring; raw source and generated results stay separate. Independent factorial PMFs, degenerate boundary tests, RPS identity checks, exported-score reaggregation, all training digests and preservation hashes pass. See verification.json. No browser/app workflow testing is needed or claimed for this isolated statistical experiment.

## Primary references
- [SciPy Poisson PMF, CDF, quantiles and log probability](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson.html)
- [scoringrules probability-score reference](https://scoringrules.readthedocs.io/en/latest/reference.html)