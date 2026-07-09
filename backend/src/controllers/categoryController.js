const categoryModel = require('../models/categoryModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const slugify = require('../utils/slugify');

const listCategories = asyncHandler(async (req, res) => {
  const categories = await categoryModel.findAll();
  res.status(200).json(categories);
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await categoryModel.findById(req.params.id);
  if (!category) throw ApiError.notFound('Catégorie introuvable');
  res.status(200).json(category);
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, parent_id: parentId } = req.body;
  const slug = slugify(name);

  if (await categoryModel.findBySlug(slug)) {
    throw ApiError.conflict('Une catégorie avec un nom équivalent existe déjà');
  }
  if (parentId) {
    const parent = await categoryModel.findById(parentId);
    if (!parent) throw ApiError.badRequest('parent_id invalide: catégorie parente introuvable');
  }

  const category = await categoryModel.create({ name, slug, parentId });
  res.status(201).json(category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const existing = await categoryModel.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Catégorie introuvable');

  const { name, parent_id: parentId } = req.body;
  const slug = slugify(name);

  const conflict = await categoryModel.findBySlug(slug);
  if (conflict && conflict.id !== existing.id) {
    throw ApiError.conflict('Une catégorie avec un nom équivalent existe déjà');
  }
  if (parentId) {
    if (Number(parentId) === Number(existing.id)) {
      throw ApiError.badRequest('Une catégorie ne peut pas être son propre parent');
    }
    const parent = await categoryModel.findById(parentId);
    if (!parent) throw ApiError.badRequest('parent_id invalide: catégorie parente introuvable');
  }

  const category = await categoryModel.update(existing.id, { name, slug, parentId });
  res.status(200).json(category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const deleted = await categoryModel.remove(req.params.id);
  if (!deleted) throw ApiError.notFound('Catégorie introuvable');
  res.status(204).send();
});

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
