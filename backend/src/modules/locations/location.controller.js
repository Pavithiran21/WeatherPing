const { currentUserId } = require('../../middleware/requireAuth');
const { idParamsSchema } = require('../../utils/validation');
const locationService = require('./location.service');
const { createLocationSchema, listLocationsQuerySchema, searchQuerySchema } = require('./location.schemas');

async function search(req, res) {
  const { q } = searchQuerySchema.parse(req.query);
  const results = await locationService.searchPlacesByText(q);
  res.json({ results });
}

async function list(req, res) {
  const pageQuery = listLocationsQuerySchema.parse(req.query);
  res.json(await locationService.listLocations(currentUserId(req), pageQuery));
}

async function create(req, res) {
  const input = createLocationSchema.parse(req.body);
  const location = await locationService.addLocation(currentUserId(req), input);
  res.status(201).json(location);
}

async function remove(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  await locationService.removeLocation(currentUserId(req), id);
  res.status(204).end();
}

async function forecast(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await locationService.getLocationForecast(currentUserId(req), id));
}

module.exports = { search, list, create, remove, forecast };
