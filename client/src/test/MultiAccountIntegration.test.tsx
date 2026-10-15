import { describe, it, expect, beforeEach } from 'vitest';
import { MonefyDatabase } from '../db/localDb';

describe('Multi-Account & Transfer Seam Logic Tests', () => {
  let db: MonefyDatabase;

  beforeEach(async () => {
    db = new MonefyDatabase(`test-account-transfer-${Date.now()}-${Math.random()}`);
    await db.initializeDefaults();
  });

  it('transfers funds from Card to Cash without altering overall net income/expense', async () => {
    const accounts = await db.accounts.toArray();
    const cash = accounts.find((a) => a.name === 'Cash') || accounts[0];
    const card = accounts.find((a) => a.name === 'Payment Card') || accounts[1];
    const categories = await db.categories.toArray();
    const generalCat = categories[0];

    const initialTotalNet = await db.calculateNetBalance();
    const initialCash = await db.calculateNetBalance(cash.id);
    const initialCard = await db.calculateNetBalance(card.id);

    // Transfer $100 from Card to Cash
    await db.addTransaction({
      amount: 100,
      type: 'transfer',
      accountId: card.id,
      toAccountId: cash.id,
      categoryId: generalCat.id,
      note: 'ATM withdrawal',
    });

    const newCash = await db.calculateNetBalance(cash.id);
    const newCard = await db.calculateNetBalance(card.id);
    const newTotalNet = await db.calculateNetBalance();

    // Verify Cash gained 100
    expect(newCash).toBe(initialCash + 100);
    // Verify Card lost 100
    expect(newCard).toBe(initialCard - 100);
    // Overall total net balance unchanged
    expect(newTotalNet).toBe(initialTotalNet);
  });
});
