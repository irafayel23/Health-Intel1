// Synthetic measurements for pre-existing case-workflow fixtures using the updated BHW contract.
function withConsultation(body) {
    return {...body,visit:body.visit ?? {transaction_mode:'Walk-in',nature_of_visit:'New consultation/case',
        consultation_time:null,blood_pressure:'120/80',temperature_c:'36.5',height_cm:'165',weight_kg:'60'}};
}
module.exports={withConsultation};
