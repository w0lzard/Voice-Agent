// ─── Mock Transcript API ──────────────────────────────────────────────────────
// Returns chat-style transcripts for any call ID.
// To connect a real backend, replace getCallTranscript() body with:
//   return fetch(`/api/v1/calls/${callId}/transcript`).then(r => r.json())

// Helper: build a timestamped transcript entry
function m(speaker, text, offsetSeconds) {
  const base = new Date('2024-06-15T10:00:00Z');
  base.setSeconds(base.getSeconds() + offsetSeconds);
  return { speaker, text, timestamp: base.toISOString() };
}

const mockTranscripts = {
  // ── Scenario A: Successful real-estate lead ───────────────────────────────
  default: [
    m('agent', 'Hello! This is Sarah from VoiceAI. Am I speaking with the homeowner?', 0),
    m('user',  'Yes, this is speaking. Who is this?', 5),
    m('agent', 'Great! I am calling regarding your property. We have a qualified buyer in your area interested in homes like yours. Are you open to hearing an offer?', 9),
    m('user',  'What kind of offer are we talking about?', 22),
    m('agent', 'The buyer is looking in the $450,000–$550,000 range. Based on recent comps in your neighbourhood, that aligns well with current market value. Would that be of interest?', 27),
    m('user',  'That actually sounds reasonable. I would like to hear more details.', 46),
    m('agent', 'Excellent! I will have our senior agent reach out within 24 hours to walk you through the process. Is this number the best way to reach you?', 53),
    m('user',  'Yes, this works. Please have her call in the morning.', 72),
    m('agent', 'Noted — morning call, this number. Thank you for your time. Have a great day!', 80),
  ],

  // ── Scenario B: Short opt-out ─────────────────────────────────────────────
  short: [
    m('agent', 'Hello, this is VoiceAI calling. May I speak with the account holder?', 0),
    m('user',  'Not interested. Please remove me from your list.', 6),
    m('agent', 'Absolutely, I understand. I will make sure you are removed immediately. I apologize for the interruption. Have a wonderful day!', 11),
    m('user',  'Thanks.', 25),
  ],

  // ── Scenario C: Highly qualified, appointment booked ─────────────────────
  qualified: [
    m('agent', 'Good afternoon! I am calling from VoiceAI on behalf of Premier Realty. Is this a good time?', 0),
    m('user',  'Sure, what is this about?', 10),
    m('agent', 'We have been reaching out to select homeowners in the Riverside district about an exclusive off-market opportunity. Are you familiar with the new development nearby?', 14),
    m('user',  'I have heard something about it, yes.', 32),
    m('agent', 'Properties in the surrounding area have appreciated 18% in the last year. Our client is looking to acquire a few more homes before the next phase begins. Are you open to a no-obligation valuation?', 38),
    m('user',  'I suppose a valuation would not hurt. What does that involve?', 65),
    m('agent', 'It is completely free and takes about 20 minutes. One of our agents will visit at a time convenient for you. Would Wednesday afternoon work?', 73),
    m('user',  'Wednesday at 3 PM sounds fine.', 98),
    m('agent', 'Perfect! I have booked you for Wednesday at 3 PM. You will receive a confirmation SMS shortly. Thank you for your time!', 105),
    m('user',  'Great, thanks for the call.', 122),
    m('agent', 'You are most welcome. See you Wednesday!', 127),
  ],

  // ── Scenario D: Customer support — billing query ──────────────────────────
  support: [
    m('agent', 'Hi there! This is Elena from VoiceAI customer support. How can I help you today?', 0),
    m('user',  'Hi. I have a question about my last invoice. I think I was double-charged.', 8),
    m('agent', 'I am sorry to hear that. I would be happy to look into it right away. Could you confirm the email address on your account?', 16),
    m('user',  'Sure, it is john.doe@email.com.', 30),
    m('agent', 'Thank you, John. I can see the account. It looks like there was a billing cycle overlap during our system migration last week. I am raising a credit note now — you should see it reflected within 3 to 5 business days.', 36),
    m('user',  'Oh okay, that makes sense. Thank you for looking into it so quickly.', 68),
    m('agent', 'Of course! Is there anything else I can help you with today?', 76),
    m('user',  'No, that is everything. You were very helpful.', 82),
    m('agent', 'My pleasure! Have a wonderful rest of your day, John!', 88),
  ],

  // ── Scenario E: Outbound sales — SaaS demo booking ───────────────────────
  saas: [
    m('agent', 'Hi, this is Mark from VoiceAI. I am reaching out because your team signed up for our free trial last month. Did you get a chance to explore the platform?', 0),
    m('user',  'A little bit, yes. We are still evaluating a few options.', 15),
    m('agent', 'Totally makes sense! A lot of our customers say the live call analytics is what really sets us apart. Would a quick 20-minute demo help you see the full picture?', 23),
    m('user',  'That could be helpful, yeah. When are you available?', 44),
    m('agent', 'I have Thursday at 2 PM or Friday at 10 AM open this week. Which works better for you?', 51),
    m('user',  'Friday morning works better.', 67),
    m('agent', 'Excellent! I will send a calendar invite to the email on your account. Is there anyone else from your team who should join?', 72),
    m('user',  'Yes, my CTO. I will forward the invite.', 88),
    m('agent', 'Perfect. Looking forward to connecting Friday. Talk soon!', 95),
  ],

  // ── Scenario F: No answer / voicemail ────────────────────────────────────
  voicemail: [
    m('agent', 'Hello, this is James from VoiceAI. I am calling regarding an opportunity that may be of interest to you. Please call us back at your convenience on 1-800-VOICEAI. Thank you and have a great day.', 0),
  ],
};

// Maps any call_id deterministically to one of the transcript scenarios.
// The same call_id will always produce the same transcript.
function getTranscriptForCall(callId) {
  const hash = (callId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const keys = Object.keys(mockTranscripts);
  return mockTranscripts[keys[hash % keys.length]];
}

/**
 * Fetch the transcript for a given call.
 *
 * MOCK MODE  — returns deterministic mock data instantly (300ms delay).
 * REAL MODE  — replace body with:
 *   return fetch(`/api/v1/calls/${callId}/transcript`).then(r => r.json())
 *
 * @param {string} callId
 * @returns {Promise<{ ok: boolean, data: { callId: string, transcript: Array } }>}
 */
export async function getCallTranscript(callId) {
  // Simulate a small network delay so loading states are visible
  await new Promise(r => setTimeout(r, 350));

  return {
    ok: true,
    data: {
      callId,
      transcript: getTranscriptForCall(callId),
    },
  };
}
