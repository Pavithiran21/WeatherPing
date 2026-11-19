const { Router } = require('express');
const ruleController = require('./rule.controller');

// Mounted at /api/rules behind requireAuth.
const ruleRouter = Router();

ruleRouter.get('/', ruleController.list);
ruleRouter.post('/', ruleController.create);
ruleRouter.get('/:id', ruleController.get);
ruleRouter.patch('/:id', ruleController.update);
ruleRouter.post('/:id/pause', ruleController.pause);
ruleRouter.post('/:id/resume', ruleController.resume);
ruleRouter.delete('/:id', ruleController.remove);

module.exports = { ruleRouter };
