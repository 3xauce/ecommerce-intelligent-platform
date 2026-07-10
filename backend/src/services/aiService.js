const ApiError = require('../utils/ApiError');

function aiServiceUrl() {
  return process.env.AI_SERVICE_URL || 'http://localhost:8010';
}

/** Appel HTTP au microservice IA (Flask + scikit-learn), timeout 15 s. */
async function callAiService(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(`${aiServiceUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(503, 'Service IA indisponible — vérifiez que ai-module est démarré (python app.py)');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new ApiError(502, `Le service IA a renvoyé une erreur (${response.status})`);
  }
  return response.json();
}

const predictSales = (history, periods = [30, 60, 90]) =>
  callAiService('/predict', { history, periods });

const analyzeTrends = (series) => callAiService('/trends', { series });

module.exports = { predictSales, analyzeTrends };
