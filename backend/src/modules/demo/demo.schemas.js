const { z } = require('zod');
const { DEMO_ROLES } = require('./demo.service');

const demoLoginSchema = z.object({
  role: z.enum(DEMO_ROLES, 'Pick one of the demo roles.'),
});

module.exports = { demoLoginSchema };
