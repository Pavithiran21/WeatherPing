const { currentUserId } = require('../../middleware/requireAuth');
const { clearRefreshCookie, setRefreshCookie } = require('../auth/authCookies');
const profileService = require('./profile.service');
const { changePasswordSchema, deleteAccountSchema, updateProfileSchema } = require('./profile.schemas');
const { toUserResponse } = require('./user.mapper');

async function getProfile(req, res) {
  const user = await profileService.getProfile(currentUserId(req));
  res.json(toUserResponse(user));
}

async function updateProfile(req, res) {
  const changes = updateProfileSchema.parse(req.body);
  const user = await profileService.updateProfile(currentUserId(req), changes);
  res.json(toUserResponse(user));
}

async function changePassword(req, res) {
  const input = changePasswordSchema.parse(req.body);
  const session = await profileService.changePassword(currentUserId(req), input);
  setRefreshCookie(res, session.refreshToken);
  res.json({ accessToken: session.accessToken });
}

async function deleteAccount(req, res) {
  const { password } = deleteAccountSchema.parse(req.body);
  await profileService.deleteAccount(currentUserId(req), password);
  clearRefreshCookie(res);
  res.status(204).end();
}

module.exports = { getProfile, updateProfile, changePassword, deleteAccount };
