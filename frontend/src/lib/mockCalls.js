// ─── Mock Call History ────────────────────────────────────────────────────────
// Used as a fallback when the backend is offline / not yet connected.
// call_id values are deterministic so they always map to the same transcript.
//
// TODO: Remove this fallback once fetchCalls() returns real data from the API.

const now = Date.now();
const mins = (m) => now - m * 60 * 1000;
const hrs  = (h) => now - h * 60 * 60 * 1000;
const days = (d) => now - d * 24 * 60 * 60 * 1000;

export const MOCK_CALLS = [
  {
    call_id: 'call_001',
    lead_phone: '+1 (555) 234-5678',
    agent_name: 'Sarah (Professional)',
    duration: 187,
    status: 'completed',
    sentiment: 'positive',
    created_at: new Date(mins(12)).toISOString(),
  },
  {
    call_id: 'call_002',
    lead_phone: '+1 (555) 876-4321',
    agent_name: 'Mark (Friendly)',
    duration: 43,
    status: 'completed',
    sentiment: 'negative',
    created_at: new Date(mins(45)).toISOString(),
  },
  {
    call_id: 'call_003',
    lead_phone: '+91 98765 43210',
    agent_name: 'James (Sophisticated)',
    duration: 312,
    status: 'completed',
    sentiment: 'positive',
    created_at: new Date(hrs(2)).toISOString(),
  },
  {
    call_id: 'call_004',
    lead_phone: '+1 (555) 111-9999',
    agent_name: 'Elena (Warm)',
    duration: null,
    status: 'failed',
    sentiment: null,
    created_at: new Date(hrs(3)).toISOString(),
  },
  {
    call_id: 'call_005',
    lead_phone: '+44 7700 900123',
    agent_name: 'Sarah (Professional)',
    duration: 265,
    status: 'completed',
    sentiment: 'positive',
    created_at: new Date(hrs(5)).toISOString(),
  },
  {
    call_id: 'call_006',
    lead_phone: '+1 (555) 303-7777',
    agent_name: 'Mark (Friendly)',
    duration: null,
    status: 'missed',
    sentiment: null,
    created_at: new Date(hrs(8)).toISOString(),
  },
  {
    call_id: 'call_007',
    lead_phone: '+1 (555) 444-2222',
    agent_name: 'Elena (Warm)',
    duration: 540,
    status: 'completed',
    sentiment: 'positive',
    created_at: new Date(days(1)).toISOString(),
  },
  {
    call_id: 'call_008',
    lead_phone: '+1 (555) 987-6543',
    agent_name: 'James (Sophisticated)',
    duration: 98,
    status: 'completed',
    sentiment: 'neutral',
    created_at: new Date(days(1)).toISOString(),
  },
  {
    call_id: 'call_009',
    lead_phone: '+61 400 123 456',
    agent_name: 'Sarah (Professional)',
    duration: null,
    status: 'failed',
    sentiment: null,
    created_at: new Date(days(2)).toISOString(),
  },
  {
    call_id: 'call_010',
    lead_phone: '+1 (555) 654-3210',
    agent_name: 'Mark (Friendly)',
    duration: 421,
    status: 'completed',
    sentiment: 'positive',
    created_at: new Date(days(3)).toISOString(),
  },
  {
    call_id: 'call_011',
    lead_phone: '+1 (555) 222-8888',
    agent_name: 'Elena (Warm)',
    duration: 155,
    status: 'completed',
    sentiment: 'neutral',
    created_at: new Date(days(4)).toISOString(),
  },
  {
    call_id: 'call_012',
    lead_phone: '+1 (555) 555-0000',
    agent_name: 'James (Sophisticated)',
    duration: null,
    status: 'missed',
    sentiment: null,
    created_at: new Date(days(5)).toISOString(),
  },
];
