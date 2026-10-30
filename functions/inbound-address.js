/**
 * Which received emails the Resend inbound webhook keeps.
 *
 * Resend receives for its own inbound domain (the Reply-To on client mail) and,
 * once the MX record is verified, for rubenjimenez.dev (contact@ and any other
 * address there). Mail to anything else is skipped.
 */
const INBOUND_DOMAINS = ["ouuldeaulk.resend.app", "rubenjimenez.dev"];

function isInboundAddress(addr) {
  const email = String(addr || "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return false;
  return INBOUND_DOMAINS.indexOf(email.slice(at + 1)) >= 0;
}

function hasInboundRecipient(list) {
  if (!Array.isArray(list)) return false;
  return list.some(isInboundAddress);
}

module.exports = { INBOUND_DOMAINS, isInboundAddress, hasInboundRecipient };
