const noopResolved = async () => ({ rows: [] });

const db = {
  query: jest.fn(noopResolved),
  insertCommission: jest.fn().mockResolvedValue({}),
  upsertSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  getSubscription: jest.fn(),
  ensureCurrentWeekCredits: jest.fn(),
  getCurrentWeekCredits: jest.fn(),
  incrementCreditsUsed: jest.fn(),
  upsertMailingListEntry: jest.fn(),
  confirmMailingListEntry: jest.fn(),
  unsubscribeMailingListEntry: jest.fn(),
  getUserCreations: jest.fn(),
  insertCommunityComment: jest.fn(),
  getCommunityComments: jest.fn(),
  insertSocialShare: jest.fn(),
  verifySocialShare: jest.fn(),
  getUserIdForReferral: jest.fn(),
  getOrCreateOrderReferralLink: jest.fn(),
  insertReferredOrder: jest.fn(),
  updateWeeklyOrderStreak: jest.fn(),
  insertGenerationLog: jest.fn(),
};

module.exports = db;
module.exports.default = db;
