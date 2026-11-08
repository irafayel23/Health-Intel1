// Suggested public-health actions, not treatment orders. Policy and sources: docs/MHO_ACTION_GUIDANCE_20261101.md.
(function(root,factory){
    if(typeof module==='object'&&module.exports)module.exports=factory();
    else root.HealthIntelActionGuidance=factory();
})(typeof window==='object'?window:this,function(){
    'use strict';
    const sources={
        respiratory:{label:'CDC respiratory prevention',url:'https://www.cdc.gov/project-firstline/hcp/infection-control/index.html'},
        gastro:{label:'WHO diarrhoeal disease guidance',url:'https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease'},
        pressure:{label:'WHO hypertension guidance',url:'https://www.who.int/news-room/fact-sheets/detail/hypertension'},
        vertigo:{label:'NHS vertigo guidance',url:'https://www.nhs.uk/conditions/Vertigo/'},
        skin:{label:'WHO primary-care skin guidance',url:'https://cdn.who.int/media/docs/default-source/ntds/skin-ntds/common-skin-diseases-for-managemen-or-referral-at-primary-health-care-level.pdf'},
        surveillance:{label:'WHO surveillance and response',url:'https://www.who.int/emergencies/alert-and-response'},
        planning:{label:'CDC prediction planning',url:'https://www.cdc.gov/cfa-behind-the-model/php/data-research/covid-short-term-forecasts.html'}
    };
    const finite=x=>typeof x==='number'&&Number.isFinite(x);
    const count=x=>x.toLocaleString('en-PH',{maximumFractionDigits:0});
    const month=x=>/^\d{4}-(0[1-9]|1[0-2])$/.test(x||'')?new Date(x+'-01T12:00:00Z').toLocaleDateString('en-PH',{month:'long',year:'numeric',timeZone:'UTC'}):'the selected month';
    function group(disease){
        if(['Cough','URTI','ARI','Influenza'].includes(disease))return 'respiratory';
        if(disease==='Acute Gastroenteritis')return 'gastro';
        if(disease==='Hypertension')return 'pressure';
        if(disease==='Vertigo')return 'vertigo';
        if(disease==='All types of skin disease')return 'skin';
        return 'assessment';
    }
    function diseaseAction(disease,place,reason){
        const kind=group(disease),base={id:'A-'+kind,reason};
        const choices={
            respiratory:{title:'Include respiratory prevention in barangay activities',owner:'BHW team and MHO nurse',
                action:`Include a short cough-etiquette and handwashing demonstration in the next scheduled health activity for ${place}. Check that the health-station waiting area is well ventilated and has hand-hygiene supplies.`,source:sources.respiratory},
            gastro:{title:'Conduct a safe-water and food-hygiene activity',owner:'BHW team and municipal sanitation officer',
                action:`Demonstrate safe drinking-water storage, handwashing with soap and safe food handling in the next scheduled health activity for ${place}. Direct reported water-quality concerns to the sanitation officer for assessment; the case count does not establish contamination.`,source:sources.gastro},
            pressure:{title:'Arrange barangay blood-pressure checks',owner:'MHO nurse and BHW team',
                action:`Include a blood-pressure checking station in the next scheduled health activity for ${place}. Confirm a functioning monitor is available and provide advice on lower-salt eating, physical activity and following the clinician's prescribed care.`,source:sources.pressure},
            vertigo:{title:'Provide balance-safety advice and access to assessment',owner:'BHW team and MHO clinician',
                action:`Provide a safe place to sit for people experiencing dizziness at the health station serving ${place}. Give advice on getting up slowly and avoiding falls; help people with persistent or recurring vertigo access a clinician.`,source:sources.vertigo},
            skin:{title:'Arrange assessment of the specific skin conditions',owner:'MHO clinician and BHW team',
                action:`Make a consultation slot available for people with persistent or recurring skin problems in ${place}. Have the clinician identify the condition before issuing scabies-specific, fungal or other disease-specific advice.`,source:sources.skin},
            assessment:{title:disease==='Fever unknown origin'?'Arrange access to fever assessment':'Arrange condition-specific assessment and advice',owner:'MHO clinician and BHW team',
                action:`Give BHWs serving ${place} a clear health-centre contact and consultation pathway for people reporting ${disease==='Infection all types'?'infection-related symptoms':disease==='Fever unknown origin'?'persistent fever':disease}. The clinician should determine the condition before a specific community response is chosen.`,source:sources.surveillance}
        };
        return {...base,...choices[kind]};
    }
    function prediction(view,predicted,previous){
        if(!finite(predicted)||predicted<0)return [];
        const place=view.barangay==='ALL'?'the selected barangays':view.barangay;
        const target=month(view.production?.['1']?.target),rounded=Math.round(predicted);
        const reason=`${view.disease}: about ${count(rounded)} estimated ${rounded===1?'case':'cases'} for ${target}${finite(previous)?', compared with '+count(previous)+' in the last recorded month':''}. This is a planning estimate.`;
        if(predicted===0)return [{id:'R2',title:'Keep existing health services accessible',owner:'MHO nurse and BHW team',reason,
            action:`Keep the existing clinic and barangay-health activity schedule available for ${place}. Tell residents how to contact the health station if symptoms develop; a zero estimate is not a reason to stop services.`,source:sources.planning}];
        const base=diseaseAction(view.disease,place,reason),result=[{...base,id:'R2'}];
        // Same rounded-count stable rule as the dashboard; no new clinical/risk threshold.
        if(finite(previous)&&rounded!==previous){
            if(predicted>previous){
                const prep={
                    respiratory:'Check the ventilation and hand-hygiene stations in the consultation area, and confirm who can cover additional respiratory-assessment slots if current demand rises.',
                    gastro:'Check the availability of oral-rehydration supplies and clinical assessment for dehydration, and ask the sanitation officer to assess any reported water-safety concerns.',
                    pressure:'Check that blood-pressure monitors are functioning and identify available blood-pressure assessment slots within the existing clinic schedule.',
                    vertigo:'Confirm a safe seating area and an accessible clinician-assessment pathway for people with balance problems.',
                    skin:'Identify available skin-assessment slots; let the clinician determine any condition-specific supplies or response.',
                    assessment:'Identify available clinical-assessment slots and a named health-centre contact for BHWs.'
                };
                result.push({id:'R3',title:'Prepare for a possible increase',owner:'MHO nurse-in-charge',reason,
                    action:`For ${target} in ${place}: ${prep[group(view.disease)]} Make any additional staffing or supply decisions against current clinical demand.`,source:sources.planning});
            }else result.push({id:'R4',title:'Keep planned care and outreach in place',owner:'MHO nurse and BHW team',reason,
                action:`Keep planned health activities and advised return visits for ${place} in place. Do not cancel services or reduce supplies solely because the ${target} estimate is lower.`,source:sources.planning});
        }
        if(previous===0&&rounded>0)result.push({id:'R5',title:'Confirm the starting count before adding resources',owner:'MHO reporting focal person',reason:'The last recorded count was zero; a percentage increase cannot be calculated.',
            action:'Ask the reporting BHW whether the zero month had a submitted report or a missing report. Resolve that distinction before using the projected increase to request additional resources.',source:sources.surveillance});
        return result;
    }
    return {prediction,diseaseAction,group,sources};
});
