<<<<<<< HEAD
// Public-health planning actions adapted from WHO guidance.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HealthIntelActionGuidance = factory();
})(typeof window === 'object' ? window : this, function () {
    'use strict';

    const sources = {
        "respiratory": {
            "label": "WHO community hand hygiene",
            "url": "https://www.who.int/publications/m/item/hand-hygien-guidelines--executive-summary"
        },
        "influenza": {
            "label": "WHO seasonal influenza",
            "url": "https://www.who.int/news-room/fact-sheets/detail/influenza-(seasonal)"
        },
        "gastro": {
            "label": "WHO diarrhoeal disease",
            "url": "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease"
        },
        "pressure": {
            "label": "WHO hypertension",
            "url": "https://www.who.int/news-room/fact-sheets/detail/hypertension"
        },
        "vertigo": {
            "label": "WHO fall prevention",
            "url": "https://www.who.int/news-room/fact-sheets/detail/falls"
        },
        "skin": {
            "label": "WHO skin assessment and referral",
            "url": "https://www.who.int/publications/i/item/9789292800024"
        },
        "assessment": {
            "label": "WHO and ICRC Basic Emergency Care",
            "url": "https://www.who.int/teams/integrated-health-services/clinical-services-and-systems/emergency-and-critical-care/bec"
        },
        "surveillance": {
            "label": "WHO guidance on verifying unusual increases",
            "url": "https://www.who.int/emergencies/outbreak-toolkit/standardized-data-collection-tools/investigating-outbreak-of-unknown-disease"
        }
    };
    const actions = {
        "Cough": [
            "Teach cough hygiene",
            "BHW team",
            "Demonstrate how to cover coughs and clean hands afterward during a health activity in {place}. Make soap and water available at the health station.",
            "respiratory"
        ],
        "URTI": [
            "Make handwashing easy at the health station",
            "BHW team",
            "Put soap and water where people can clean their hands at the health station serving {place}. Remind families to wash their hands after blowing their nose, coughing or sneezing.",
            "respiratory"
        ],
        "ARI": [
            "Prepare for urgent respiratory assessment",
            "MHO nurse and BHW team",
            "Confirm where staff in {place} should send people with acute breathing difficulty and how to contact the receiving facility promptly. Use the existing urgent referral process.",
            "assessment"
        ],
        "Influenza": [
            "Share influenza prevention and vaccination information",
            "MHO immunization team and BHW team",
            "Share the local influenza vaccination schedule in {place} where services are available. Prioritize outreach to people at higher risk of complications and remind residents about cough hygiene and handwashing.",
            "influenza"
        ],
        "Acute Gastroenteritis": [
            "Demonstrate safe water and hygiene",
            "BHW team and municipal sanitation officer",
            "Show residents in {place} how to use safe drinking water and wash hands with soap. Confirm the health station has oral rehydration supplies and can assess people with signs of dehydration.",
            "gastro"
        ],
        "Hypertension": [
            "Arrange blood pressure checks",
            "MHO nurse and BHW team",
            "Set up blood pressure checks at the next scheduled health activity in {place}. Confirm the monitor works and give residents with elevated readings a follow-up pathway.",
            "pressure"
        ],
        "Vertigo": [
            "Reduce fall hazards and arrange assessment",
            "BHW team and MHO clinician",
            "Keep walkways clear and offer a place to sit for people with dizziness in {place}. Help people with persistent symptoms reach a clinician, and review fall hazards for older adults.",
            "vertigo"
        ],
        "All types of skin disease": [
            "Arrange skin assessment and referral",
            "MHO clinician and BHW team",
            "Set aside consultation time for persistent skin symptoms in {place}. Have a clinician assess the signs and decide whether referral or condition-specific advice is needed.",
            "skin"
        ],
        "Fever unknown origin": [
            "Arrange assessment for unexplained fever",
            "MHO clinician and BHW team",
            "Share the health centre contact and referral pathway for unexplained fever with BHWs in {place}. Let the receiving clinical team decide the urgency and assessment needed.",
            "assessment"
        ],
        "Infection all types": [
            "Review recorded infections by condition",
            "MHO surveillance focal person and clinician",
            "Review which diagnoses make up the infection category in {place}. If verified reports show an unusual increase, check the case records and discuss the pattern with the MHO surveillance team.",
            "surveillance"
        ]
    };

    function prediction(view, predicted, previous) {
        if (!Number.isFinite(predicted) || predicted < 0) return [];
        const selection = actions[view.disease];
        if (!Array.isArray(selection)) return [];

        const [title, owner, action, source] = selection;
        const place = view.barangay === 'ALL' ? 'the selected barangays' : view.barangay;
        const target = view.production?.['1']?.target;
        const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(target || '')
            ? new Date(target + '-01T12:00:00Z').toLocaleDateString('en-PH', {
                month: 'long', year: 'numeric', timeZone: 'UTC'
            })
            : 'the selected month';
        const count = Math.round(predicted);
        const reason = view.disease + ': about ' + count + ' estimated cases for ' + month + '.';
        const result = [{ id: 'R2', title, owner, action: action.replace('{place}', place), reason, source: sources[source] }];
        if (count === previous || !Number.isFinite(previous) || predicted === 0) return result;

        if (count > previous) {
            result.push({
                id: 'R3', title: 'Check current reports before changing services', owner: 'MHO reporting team', reason,
                action: 'For ' + month + ' in ' + place + ', verify that reports are complete and check for a rise in confirmed cases before adjusting staffing, supplies or outreach.',
                source: sources.surveillance
            });
        } else {
            result.push({
                id: 'R4', title: 'Keep planned care and outreach in place', owner: 'MHO nurse and BHW team', reason,
                action: 'Keep planned care and advised return visits for ' + place + ' on the schedule for ' + month + '. Review changes against verified reports and current service demand.',
                source: sources[source]
            });
        }
        if (previous === 0 && count > 0) {
            result.push({
                id: 'R5', title: 'Check whether the zero count was confirmed', owner: 'MHO reporting team', reason,
                action: 'Ask the barangay reporting team whether a complete report confirmed zero cases. Resolve any missing report before interpreting the estimated change.',
                source: sources.surveillance
            });
        }
        return result;
    }

    return { prediction, sources };
});
=======
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
>>>>>>> 77e33a469de54a41ddaeb994c2f5451c516ee426
