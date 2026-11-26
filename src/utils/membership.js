const { razorpayMode } = require("../config/env");

const membershipView = user => {
  // Read access for the current gateway mode only: a sandbox purchase must never unlock live Premium.
  const snapshot = user?.memberships?.get?.(razorpayMode) || user?.memberships?.[razorpayMode];
  const value = snapshot || { active: user?.isPremium && user.membershipMode === razorpayMode, type: user?.membershipType, expiresAt: user?.membershipExpiresAt };
  // Check expiry when reading so access ends on time even if no new payment event arrives.
  const active = Boolean(value.active && new Date(value.expiresAt).getTime() > Date.now());
  return { active, type: active ? value.type : null, expiresAt: active ? value.expiresAt : null, mode: razorpayMode };
};

const membershipTransform = (document, object) => {
  if (Object.hasOwn(object, "isPremium")) {
    const membership = membershipView(object);
    object.isPremium = membership.active;
    object.membershipType = membership.type;
    object.membershipExpiresAt = membership.expiresAt;
    delete object.memberships;
  }
  return object;
};

module.exports = { membershipView, membershipTransform };
