// The only user shape the API returns: never the password hash.
function toUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    timeZone: user.timeZone,
    isDemo: user.isDemo,
    createdAt: user.createdAt,
  };
}

module.exports = { toUserResponse };
