const productModel = require('../models/productModel');
const predictionModel = require('../models/predictionModel');
const aiService = require('../services/aiService');
const magicCompareService = require('../services/magicCompareService');
const chatbotService = require('../services/chatbotService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const getPredictions = asyncHandler(async (req, res) => {
  const product = await productModel.findById(req.params.productId);
  if (!product) throw ApiError.notFound('Produit introuvable');
  if (req.user.role !== 'admin' && product.vendor_id !== req.user.id) {
    throw ApiError.forbidden("Vous n'êtes pas propriétaire de ce produit");
  }

  const history = await predictionModel.salesHistory(product.id, 120);
  const result = await aiService.predictSales(history, [30, 60, 90]);

  const stored = [];
  for (const prediction of result.predictions) {
    stored.push(
      await predictionModel.storePrediction({
        productId: product.id,
        predictionType: 'sales_forecast',
        predictedValue: prediction.predicted_units,
        confidence: prediction.confidence,
        periodDays: prediction.period_days,
      })
    );
  }

  res.status(200).json({
    product: { id: product.id, name: product.name, price: Number(product.price) },
    model: result.model,
    history,
    predictions: stored.map((row, i) => ({
      period_days: result.predictions[i].period_days,
      predicted_units: result.predictions[i].predicted_units,
      confidence: result.predictions[i].confidence,
      stored_id: row.id,
    })),
  });
});

const getTrends = asyncHandler(async (req, res) => {
  const vendorId = req.user.role === 'admin' ? undefined : req.user.id;
  const { items } = await productModel.list({ vendorId, limit: 50, offset: 0 });

  if (items.length === 0) {
    return res.status(200).json({ trends: [] });
  }

  const series = [];
  for (const product of items) {
    const history = await predictionModel.salesHistory(product.id, 30);
    series.push({ product_id: product.id, name: product.name, history });
  }

  const result = await aiService.analyzeTrends(series);
  res.status(200).json(result);
});

const magicCompare = asyncHandler(async (req, res) => {
  const vendorId = req.user.role === 'admin' ? undefined : req.user.id;
  const { items } = await productModel.list({ vendorId, limit: 100, offset: 0 });

  const analysis = await magicCompareService.magicCompare(req.body.url, items);
  res.status(200).json(analysis);
});

const chatbot = asyncHandler(async (req, res) => {
  const reply = await chatbotService.answer(req.user, req.body.message);
  res.status(200).json(reply);
});

module.exports = { getPredictions, getTrends, magicCompare, chatbot };
