const { Router } = require('express');
const { searchLimiter } = require('../../middleware/rateLimiters');
const locationController = require('./location.controller');

// Mounted at /api/locations behind requireAuth.
const locationRouter = Router();

locationRouter.get('/search', searchLimiter, locationController.search);
locationRouter.get('/', locationController.list);
locationRouter.post('/', locationController.create);
locationRouter.get('/:id/forecast', locationController.forecast);
locationRouter.delete('/:id', locationController.remove);

module.exports = { locationRouter };
