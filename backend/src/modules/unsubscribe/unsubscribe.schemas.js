const { z } = require('zod');

const unsubscribeBodySchema = z.object({
  token: z.string().min(1, "This unsubscribe link isn't valid.").max(200),
});

module.exports = { unsubscribeBodySchema };
