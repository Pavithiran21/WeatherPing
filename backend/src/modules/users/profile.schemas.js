const { z } = require('zod');
const {
  currentPasswordField,
  nameField,
  newPasswordField,
  timeZoneField,
} = require('../auth/auth.schemas');

// Unknown keys (for example "email") are dropped, so only name and time zone can change.
const updateProfileSchema = z
  .object({
    name: nameField.optional(),
    timeZone: timeZoneField.optional(),
  })
  .refine((body) => body.name !== undefined || body.timeZone !== undefined, 'Change your name or time zone.');

const changePasswordSchema = z.object({
  currentPassword: currentPasswordField,
  newPassword: newPasswordField,
});

const deleteAccountSchema = z.object({
  password: currentPasswordField,
});

module.exports = { updateProfileSchema, changePasswordSchema, deleteAccountSchema };
