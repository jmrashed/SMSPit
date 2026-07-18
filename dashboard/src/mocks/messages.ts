import type { Message } from '../types/message';

// Static placeholder data -- real API wiring lands on Day 23
// (checklist.md), which replaces this with fetched data.
export const MOCK_MESSAGES: Message[] = [
  {
    id: 'sms_1',
    to: '+8801700000001',
    from: 'SMSPit',
    message: 'Your OTP is 845231',
    status: 'captured',
    created_at: '2026-07-19T01:00:00.000Z',
  },
  {
    id: 'sms_2',
    to: '+8801700000002',
    from: 'SMSPit',
    message: 'Your order has shipped and is on its way.',
    status: 'captured',
    created_at: '2026-07-19T00:45:00.000Z',
  },
  {
    id: 'sms_3',
    to: '+8801700000003',
    from: 'SMSPit',
    message: 'Delivery failed: invalid number',
    status: 'failed',
    created_at: '2026-07-19T00:30:00.000Z',
  },
];

// Simulates an async lookup (network latency) so the detail page's
// loading state is genuine, not just a placeholder -- Day 23 swaps
// this for a real fetch to GET /api/v1/messages/{id}.
export function findMockMessageById(id: string): Promise<Message | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_MESSAGES.find((m) => m.id === id)), 300);
  });
}
