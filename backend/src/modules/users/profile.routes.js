const { Router } = require('express');
const profileController = require('./profile.controller');

// Mounted at /api/me behind requireAuth: every route acts on the logged-in user only.
const profileRouter = Router();

profileRouter.get('/', profileController.getProfile);
profileRouter.patch('/', profileController.updateProfile);
profileRouter.post('/password', profileController.changePassword);
profileRouter.delete('/', profileController.deleteAccount);

module.exports = { profileRouter };
