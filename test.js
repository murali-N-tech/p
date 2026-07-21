const mLower = "fraud_merchant_1";
const FRAUD_BLACKLIST_MERCHANT = ["scam", "fraud", "fake", "unknown phone contact"];
let isVerifiedFraud = false;
if (FRAUD_BLACKLIST_MERCHANT.some(b => mLower.includes(b))) {
  isVerifiedFraud = true;
}
console.log(isVerifiedFraud);
