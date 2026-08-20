import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BrainCircuit, Radar, Loader2, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import api from '../../lib/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function PredictivePanel() {
  const [timeframe, setTimeframe] = useState('monthly');
  const [dssLoading, setDssLoading] = useState(false);
  const [dssDone, setDssDone] = useState(false);

  // Fetch predictions
  const { data: predictions, isLoading, error } = useQuery({
    queryKey: ['predictions', timeframe],
    queryFn: () => api.get(`/api/get-predictions?timeframe=${timeframe}`).then(res => res.data.data),
  });

  // Prediction bar chart data
  const predictionChartData = {
    labels: predictions?.map(item => item.barangay) || [],
    datasets: [
      {
        label: timeframe === 'weekly' ? 'Predicted Cases (Next 7 Days)' : 'Predicted Cases (Next Month)',
        data: predictions?.map(item => item.predicted_cases) || [],
        backgroundColor: predictions?.map(item => {
          if (item.risk_level === 'High/Outbreak') return 'rgba(255, 99, 132, 0.8)';
          if (item.risk_level === 'Medium') return 'rgba(255, 206, 86, 0.8)';
          return 'rgba(75, 192, 192, 0.8)';
        }) || [],
        borderColor: predictions?.map(item => {
          if (item.risk_level === 'High/Outbreak') return 'rgba(255, 99, 132, 1)';
          if (item.risk_level === 'Medium') return 'rgba(255, 206, 86, 1)';
          return 'rgba(75, 192, 192, 1)';
        }) || [],
        borderWidth: 1,
      },
    ],
  };

  const predictionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } },
  };

  // Trend chart data (hardcoded historical + AI prediction)
  const trendLabels = timeframe === 'monthly'
    ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','NEXT MONTH (AI)']
    : ['Wk 40','Wk 41','Wk 42','Wk 43','Wk 44','Wk 45','Wk 46','Wk 47','Wk 48','Wk 49','Wk 50','Wk 51','NEXT 7 DAYS (AI)'];

  const trendData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Historical Cases',
        data: timeframe === 'monthly'
          ? [25,22,20,28,35,50,75,85,60,40,28,22,null]
          : [3,2,4,3,5,4,7,6,8,12,15,18,null],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'AI Prediction',
        data: timeframe === 'monthly'
          ? [null,null,null,null,null,null,null,null,null,null,null,22, predictions ? predictions.reduce((sum, item) => sum + item.predicted_cases, 0) : 0]
          : [null,null,null,null,null,null,null,null,null,null,null,18, predictions ? predictions.reduce((sum, item) => sum + item.predicted_cases, 0) : 0],
        borderColor: '#ef4444',
        borderDash: [5,5],
        borderWidth: 3,
        pointBackgroundColor: '#ef4444',
        pointRadius: 6,
      },
    ],
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } },
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            if (context.datasetIndex === 1 && context.dataIndex === 12)
              return ` AI Prediction: ${context.raw} Cases`;
            return ` ${context.raw} Cases`;
          },
        },
      },
    },
  };

  const handleGenerateDSS = () => {
    setDssLoading(true);
    setDssDone(false);
    setTimeout(() => {
      setDssLoading(false);
      setDssDone(true);
    }, 1500);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Predictive Analytics</h2>
          <p className="text-gray-600">Scikit-learn & SARIMA models for outbreak early warning.</p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => setTimeframe('weekly')}
            className={`px-4 py-2 rounded-md font-bold transition ${
              timeframe === 'weekly' ? 'bg-blue-900 text-white' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Weekly (7 Days)
          </button>
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-4 py-2 rounded-md font-bold transition ${
              timeframe === 'monthly' ? 'bg-blue-900 text-white' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Monthly (30 Days)
          </button>
        </div>
      </div>

      {/* Prediction bar chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        )}
        {error && (
          <div className="text-red-500 font-bold text-center py-8">
            Error: Could not connect to AI Engine.
          </div>
        )}
        {!isLoading && !error && (
          <>
            <h3 className="font-semibold text-gray-900 mb-4">Predicted Outbreak Cases</h3>
            <div className="h-80">
              <Bar data={predictionChartData} options={predictionOptions} />
            </div>
          </>
        )}
      </div>

      {/* Trend chart + DSS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <BrainCircuit className="w-5 h-5 text-sky-500" />
          Historical Trend & AI Forecast
        </h3>
        <div className="h-72 mb-6">
          <Line data={trendData} options={trendOptions} />
        </div>

        <div className="border-t-2 border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-gray-900 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-sky-500" />
              Actionable Interventions (DSS)
            </h4>
            <button
              onClick={handleGenerateDSS}
              disabled={dssLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-white transition ${
                dssLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {dssLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Forecast...
                </>
              ) : dssDone ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Analysis Complete
                </>
              ) : (
                <>
                  <Radar className="w-4 h-4" />
                  Generate Actions
                </>
              )}
            </button>
          </div>

          {dssDone && (
            <div className="space-y-4">
              {/* Urgent alert */}
              <div className="flex items-start gap-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <AlertTriangle className="w-7 h-7 text-red-500 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-red-800">PREVENTATIVE URGENT: High Probability Dengue Spike</h5>
                  <p className="text-sm text-red-700 mt-1">
                    The AI model forecasts a breach of the outbreak threshold ({">"}15 cases) in Poblacion over the next 14 days due to recent weather patterns.<br />
                    <strong>Prescribed Action:</strong> Pre-emptively deploy Fogging Operations and distribute Ovicidal Traps in Poblacion immediately.
                  </p>
                </div>
              </div>
              {/* Recommendation */}
              <div className="flex items-start gap-4 bg-sky-50 border-l-4 border-sky-500 p-4 rounded-lg">
                <Info className="w-7 h-7 text-sky-500 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-sky-800">RECOMMENDATION: Routine Campaign Trigger</h5>
                  <p className="text-sm text-sky-700 mt-1">
                    "Animal Bite" cases are demonstrating a steady upward trend municipal-wide over the last quarter.<br />
                    <strong>Prescribed Action:</strong> Initiate LGU-wide Rabies Awareness Campaign and verify ABTC (Animal Bite Treatment Center) vaccine stock for next month.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}