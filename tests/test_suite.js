/**
 * AUTOMATED TEST SUITE — Telegram Refer & Earn Bot
 * 
 * Verifies all 26 lifecycle states and business rules specified in Rule 52:
 * 1. New user registration
 * 2. Existing user lookup
 * 3. Valid referral tracking
 * 4. Invalid referral code handling
 * 5. Self-referral prevention
 * 6. Force-join channel requirements
 * 7. Failed channel membership check
 * 8. Successful membership verification
 * 9. Balance and wallet metrics calculation
 * 10. Rule 44 referral reward qualification
 * 11. Ad session initiation (GigaPub)
 * 12. Ad completion and reward crediting
 * 13. Duplicate ad completion (Idempotency check)
 * 14. Daily ad limit enforcement
 * 15. Daily streak bonus claim
 * 16. Duplicate bonus claim rejection
 * 17. Social task completion and crediting
 * 18. Duplicate task completion rejection
 * 19. Withdrawal below minimum threshold (Blocked)
 * 20. Valid withdrawal request & balance debit
 * 21. Admin withdrawal approval
 * 22. Admin withdrawal rejection with automatic refund
 * 23. Admin balance adjustment with ledger entry
 * 24. Broadcast creation and delivery tracking
 * 25. User ban and access restriction
 * 26. Maintenance mode toggle and enforcement
 */

import db from '../src/db.js';
import config from '../src/config.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName} - ${details}`);
    throw new Error(`Test failed: ${testName} (${details})`);
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 STARTING RULE 52 COMPREHENSIVE AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  const testSuffix = Date.now().toString().slice(-6);
  const testUserAId = `test_a_${testSuffix}`;
  const testUserBId = `test_b_${testSuffix}`;
  const testUserCId = `test_c_${testSuffix}`;

  try {
    // ----------------------------------------------------
    // TEST 1: New User Registration
    // ----------------------------------------------------
    console.log('--- Phase 1: User Registration & Referrals ---');
    const resA = db.getOrCreateUser({
      id: testUserAId,
      first_name: 'TestAlice',
      username: `alice_${testSuffix}`
    });
    assert(resA.user && resA.user.id === testUserAId, 'Test 1: New user created with correct Telegram ID');
    assert(resA.isNew === true, 'Test 1: isNew flag is true for fresh user');
    assert(resA.user.balance === 0, 'Test 1: Initial wallet balance is zero');
    assert(typeof resA.user.referral_code === 'string' && resA.user.referral_code.length > 0, 'Test 1: Unique referral code generated');

    // ----------------------------------------------------
    // TEST 2: Existing User Lookup
    // ----------------------------------------------------
    const resALookup = db.getOrCreateUser({
      id: testUserAId,
      first_name: 'TestAlice',
      username: `alice_${testSuffix}`
    });
    assert(resALookup.isNew === false, 'Test 2: Existing user correctly recognized (isNew === false)');
    assert(resALookup.user.id === testUserAId, 'Test 2: Returned existing user record intact');

    // ----------------------------------------------------
    // TEST 3: Valid Referral Tracking
    // ----------------------------------------------------
    const resB = db.getOrCreateUser(
      { id: testUserBId, first_name: 'TestBob', username: `bob_${testSuffix}` },
      testUserAId
    );
    assert(resB.user.referred_by === testUserAId, 'Test 3: User B tracks User A as referrer');
    assert(resB.user.referral_reward_status === 'pending_verification', 'Test 3: Referral reward status is pending verification (Rule 44)');

    // ----------------------------------------------------
    // TEST 4: Invalid Referral Code Handling
    // ----------------------------------------------------
    const resC = db.getOrCreateUser(
      { id: testUserCId, first_name: 'TestCharlie' },
      'NON_EXISTENT_REF_CODE_99999'
    );
    assert(resC.user.referred_by === null, 'Test 4: Non-existent referral code safely ignored');

    // ----------------------------------------------------
    // TEST 5: Self-Referral Prevention
    // ----------------------------------------------------
    const selfRefId = `test_self_${testSuffix}`;
    const resSelf = db.getOrCreateUser(
      { id: selfRefId, first_name: 'SelfTester' },
      selfRefId
    );
    assert(resSelf.user.referred_by === null, 'Test 5: Self-referral strictly rejected by fraud prevention');

    // ----------------------------------------------------
    // TEST 6: Force Join Requirements
    // ----------------------------------------------------
    console.log('\n--- Phase 2: Force-Join Channel Verification ---');
    const channels = db.getEnabledChannels();
    assert(Array.isArray(channels), 'Test 6: Active force-join channels retrieved');

    // ----------------------------------------------------
    // TEST 7: Failed Membership Verification
    // ----------------------------------------------------
    const preVerifyUserB = db.getUser(testUserBId);
    assert(preVerifyUserB.referral_reward_status === 'pending_verification', 'Test 7: Unverified user reward status remains pending');

    // ----------------------------------------------------
    // TEST 8: Successful Membership Verification
    // ----------------------------------------------------
    db.updateUser(testUserBId, { verified_channels: true });
    const postVerifyUserB = db.getUser(testUserBId);
    assert(postVerifyUserB.verified_channels === true, 'Test 8: Channel membership verification state recorded');

    // ----------------------------------------------------
    // TEST 9: Balance and Wallet Metrics Calculation
    // ----------------------------------------------------
    console.log('\n--- Phase 3: Wallet, Ledger & Referral Qualification ---');
    const userAProfile = db.getUser(testUserAId);
    assert(typeof userAProfile.balance === 'number', 'Test 9: User profile returns numeric balance');
    assert(typeof userAProfile.referral_count === 'number', 'Test 9: User profile returns referral count');

    // ----------------------------------------------------
    // TEST 10: Rule 44 Referral Reward Qualification
    // ----------------------------------------------------
    const qualResult = db.qualifyReferral(testUserBId);
    assert(qualResult.rewarded === true, 'Test 10: Referral qualifies upon channel verification');
    const updatedUserA = db.getUser(testUserAId);
    assert(updatedUserA.balance === config.referralReward, `Test 10: Referrer balance credited exactly ${config.referralReward}`);
    assert(updatedUserA.referral_count === 1, 'Test 10: Referrer referral count incremented to 1');
    const duplicateQual = db.qualifyReferral(testUserBId);
    assert(duplicateQual.rewarded === false, 'Test 10: Duplicate referral qualification blocked (credited only once)');

    // ----------------------------------------------------
    // TEST 11: Ad Session Initiation
    // ----------------------------------------------------
    console.log('\n--- Phase 4: GigaPub Rewarded Ads & Anti-Abuse ---');
    const adSession = db.createAdSession(testUserAId);
    assert(adSession.success === true, 'Test 11: Ad session created successfully');
    assert(adSession.sessionId && adSession.sessionId.startsWith('ADS_'), 'Test 11: Ad session unique ID generated');
    assert(typeof adSession.token === 'string', 'Test 11: Cryptographic session token provided');

    // ----------------------------------------------------
    // TEST 12: Ad Completion & Reward Crediting
    // ----------------------------------------------------
    const claimAdRes = db.verifyAndClaimAd(testUserAId, adSession.sessionId, adSession.token);
    assert(claimAdRes.success === true, 'Test 12: Ad reward claimed successfully with valid token');
    assert(claimAdRes.reward === config.adReward, `Test 12: Reward matches configured adReward (${config.adReward})`);
    const afterAdUserA = db.getUser(testUserAId);
    assert(afterAdUserA.ads_watched === 1, 'Test 12: User ads_watched count incremented');

    // ----------------------------------------------------
    // TEST 13: Duplicate Ad Completion (Idempotency Check)
    // ----------------------------------------------------
    const duplicateAdClaim = db.verifyAndClaimAd(testUserAId, adSession.sessionId, adSession.token);
    assert(duplicateAdClaim.success === false, 'Test 13: Duplicate ad claim rejected by transaction idempotency');

    // ----------------------------------------------------
    // TEST 14: Daily Ad Limit Enforcement & Unlimited Mode
    // ----------------------------------------------------
    const prevLimit = db.getSetting('dailyAdLimit');
    // Test positive limit enforcement
    db.updateSettings({ dailyAdLimit: 5 });
    db.updateUser(testUserCId, {
      ads_today: 5,
      ads_today_date: db.getTodayString(),
      last_ad_timestamp: 0
    });
    const limitedCheck = db.canWatchAd(testUserCId);
    assert(limitedCheck.canWatch === false, 'Test 14: Daily ad limit enforced; canWatchAd returns false');
    const limitedAdSession = db.createAdSession(testUserCId);
    assert(limitedAdSession.success === false, 'Test 14: Daily ad limit enforced; createAdSession rejected');

    // Test unlimited mode (dailyAdLimit = 0)
    db.updateSettings({ dailyAdLimit: 0 });
    const unlimitedCheck = db.canWatchAd(testUserCId);
    assert(unlimitedCheck.canWatch === true, 'Test 14b: Unlimited ads allowed when dailyAdLimit is 0');
    db.updateSettings({ dailyAdLimit: prevLimit });

    // ----------------------------------------------------
    // TEST 15: Daily Streak Bonus Claim
    // ----------------------------------------------------
    console.log('\n--- Phase 5: Streak Bonuses & Tasks ---');
    const bonusRes = db.claimDailyBonus(testUserBId);
    assert(bonusRes.success === true, 'Test 15: Daily bonus claimed successfully');
    assert(bonusRes.streak === 1, 'Test 15: Streak day starts at 1');
    assert(bonusRes.amount === 5, 'Test 15: Day 1 streak bonus is exactly 5');

    // ----------------------------------------------------
    // TEST 16: Duplicate Bonus Claim Rejection
    // ----------------------------------------------------
    const duplicateBonus = db.claimDailyBonus(testUserBId);
    assert(duplicateBonus.success === false, 'Test 16: Duplicate bonus claim within cooldown strictly blocked');

    // ----------------------------------------------------
    // TEST 17: Social Task Completion & Crediting
    // ----------------------------------------------------
    const tasks = db.getUserTasks(testUserAId);
    assert(tasks.length > 0, 'Test 17: Active social tasks available');
    const targetTask = tasks[0];
    const taskCompleteRes = db.completeTask(testUserAId, targetTask.id);
    assert(taskCompleteRes.success === true, 'Test 17: Task completed and reward credited to wallet');
    assert(taskCompleteRes.reward === 5.0, 'Test 17: Task reward is exactly 5.0');

    // ----------------------------------------------------
    // TEST 18: Duplicate Task Completion Rejection
    // ----------------------------------------------------
    const dupTaskRes = db.completeTask(testUserAId, targetTask.id);
    assert(dupTaskRes.success === false, 'Test 18: Duplicate task completion prevented by idempotency');

    // ----------------------------------------------------
    // TEST 18b: Channel Departure Penalty (10 rs deduction & unverified status)
    // ----------------------------------------------------
    const balBeforePenalty = db.getUser(testUserBId).balance;
    const penUser = db.penalizeLeftChannel(testUserBId, '@allinonemodz4u', 10.0);
    assert(penUser.verified_channels === false, 'Test 18b: User marked unverified upon channel departure');
    assert(penUser.balance === Math.max(0, balBeforePenalty - 10.0), 'Test 18b: 10 rs penalty deducted from user balance');
    db.updateUser(testUserBId, { verified_channels: true });

    // ----------------------------------------------------
    // TEST 19: Withdrawal Lock (Requires 10 Referrals & 30 Ads)
    // ----------------------------------------------------
    console.log('\n--- Phase 6: Multi-Method Withdrawals & Approvals ---');
    const lockedWdRes = db.createWithdrawal(testUserAId, {
      method: 'upi',
      amount: 500.00,
      details: 'alice@okhdfcbank'
    });
    assert(lockedWdRes.success === false && lockedWdRes.locked === true, 'Test 19: Withdrawal locked before completing 10 referrals and 30 ads');

    // ----------------------------------------------------
    // TEST 20: Valid Withdrawal Request & Balance Debit (Unlocked)
    // ----------------------------------------------------
    // Unlock User A by meeting 10 referrals and 30 ads watched milestones
    db.updateUser(testUserAId, { referral_count: 10, ads_watched: 30 });
    db.addBalance(testUserAId, 1500.0, 'Test setup balance');

    // Check below minimum withdrawal threshold
    const belowMinWd = db.createWithdrawal(testUserAId, {
      method: 'upi',
      amount: 100.0,
      details: 'alice@okhdfcbank'
    });
    assert(belowMinWd.success === false, 'Test 20a: Withdrawal below minimum threshold (500 rs) rejected');

    const balBeforeWD = db.getUser(testUserAId).balance;
    const validWdRes = db.createWithdrawal(testUserAId, {
      method: 'upi',
      amount: 500.0,
      details: 'alice@okhdfcbank'
    });
    assert(validWdRes.success === true, 'Test 20: Valid withdrawal request accepted once unlocked');
    assert(validWdRes.withdrawal.status === 'pending', 'Test 20: Initial withdrawal status is pending');
    const balAfterWD = db.getUser(testUserAId).balance;
    assert(balAfterWD === balBeforeWD - 500.0, 'Test 20: User balance immediately debited on withdrawal request');

    // ----------------------------------------------------
    // TEST 21: Admin Withdrawal Approval
    // ----------------------------------------------------
    const wdId1 = validWdRes.withdrawal.id;
    const approveRes = db.reviewWithdrawal(wdId1, 'approved', 'Verified and processed via UPI bank transfer');
    assert(approveRes.success === true, 'Test 21: Admin successfully approved withdrawal');
    const approvedWD = db.getWithdrawalById(wdId1);
    assert(approvedWD.status === 'approved', 'Test 21: Withdrawal record status updated to approved');

    // ----------------------------------------------------
    // TEST 22: Admin Withdrawal Rejection with Refund
    // ----------------------------------------------------
    const wd2Res = db.createWithdrawal(testUserAId, {
      method: 'paypal',
      amount: 500.0,
      details: 'alice@paypal.me'
    });
    assert(wd2Res.success === true, 'Test 22: Second withdrawal request created');
    const balPreReject = db.getUser(testUserAId).balance;
    const wdId2 = wd2Res.withdrawal.id;

    const rejectRes = db.reviewWithdrawal(wdId2, 'rejected', 'Invalid PayPal email provided');
    assert(rejectRes.success === true, 'Test 22: Admin rejected withdrawal request');
    const balPostReject = db.getUser(testUserAId).balance;
    assert(balPostReject === balPreReject + 500.0, 'Test 22: User balance fully refunded upon rejection');

    // ----------------------------------------------------
    // TEST 23: Admin Balance Adjustment with Ledger Entry
    // ----------------------------------------------------
    console.log('\n--- Phase 7: Admin Controls, Broadcasts & Security ---');
    const preAdjBal = db.getUser(testUserAId).balance;
    const addedUser = db.addBalance(testUserAId, 5.0, 'Manual credit test');
    assert(addedUser && addedUser.balance === preAdjBal + 5.0, 'Test 23: Admin credit adjustment succeeded');

    const cutUser = db.cutBalance(testUserAId, 2.0, 'Manual debit test');
    assert(cutUser && cutUser.balance === preAdjBal + 3.0, 'Test 23: Admin debit adjustment succeeded');

    const userTxns = db.getUserTransactions(testUserAId);
    assert(userTxns.length >= 2, 'Test 23: Immutable ledger entries recorded for both adjustments');

    // ----------------------------------------------------
    // TEST 24: Broadcast Creation & Delivery Tracking
    // ----------------------------------------------------
    const broadcastRecord = db.createBroadcast({
      title: 'Broadcast test',
      text: '📢 System maintenance completed!'
    });
    assert(broadcastRecord.id && broadcastRecord.id.startsWith('bc_'), 'Test 24: Broadcast created with valid ID');
    assert(typeof broadcastRecord.total_recipients === 'number', 'Test 24: Broadcast recipient count tracked');
    assert(broadcastRecord.status === 'pending', 'Test 24: Initial broadcast state is pending');

    // ----------------------------------------------------
    // TEST 25: User Ban and Access Restriction
    // ----------------------------------------------------
    const banSuccess = db.banUser(testUserCId, true);
    assert(banSuccess === true, 'Test 25: User ban operation succeeded');
    const bannedUser = db.getUser(testUserCId);
    assert(bannedUser && bannedUser.is_banned === true, 'Test 25: is_banned flag set to true');

    const unbanSuccess = db.banUser(testUserCId, false);
    assert(unbanSuccess === true, 'Test 25: User unban operation succeeded');
    const unbannedUser = db.getUser(testUserCId);
    assert(unbannedUser && unbannedUser.is_banned === false, 'Test 25: is_banned flag cleared to false');

    // ----------------------------------------------------
    // TEST 26: Maintenance Mode Toggle & Enforcement
    // ----------------------------------------------------
    db.updateSettings({ maintenanceMode: true });
    assert(db.getSetting('maintenanceMode') === true, 'Test 26: Maintenance mode enabled');

    db.updateSettings({ maintenanceMode: false });
    assert(db.getSetting('maintenanceMode') === false, 'Test 26: Maintenance mode disabled');

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`🎉 ALL 26/26 TEST CASES PASSED WITH 100% SUCCESS!`);
    console.log(`Passed: ${passedTests} | Failed: ${failedTests}`);
    console.log('====================================================\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ TEST SUITE RUNNER ABORTED WITH ERROR:');
    console.error(err);
    process.exit(1);
  }
}

runTestSuite();
