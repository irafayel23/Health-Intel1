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

    function prediction(view, predicted, previous, target = view.production?.['1']?.target) {
        if (!Number.isFinite(predicted) || predicted < 0) return [];
        const selection = actions[view.disease];
        if (!Array.isArray(selection)) return [];

        const [title, owner, action, source] = selection;
        const place = view.barangay === 'ALL' ? 'the selected barangays' : view.barangay;
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
