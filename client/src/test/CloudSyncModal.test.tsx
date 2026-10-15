import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CloudSyncModal } from '../components/sync/CloudSyncModal';

describe('CloudSyncModal Seam Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders login/register forms for guest users and switches mode', () => {
    render(
      <CloudSyncModal
        isOpen={true}
        onClose={vi.fn()}
        user={null}
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        onSyncNow={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByText('Cloud Sync')).toBeInTheDocument();
    expect(screen.getByText(/Local Guest Mode/i)).toBeInTheDocument();

    // Toggle to Create Account
    const registerTab = screen.getByTestId('tab-auth-register');
    fireEvent.click(registerTab);

    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
    expect(screen.getByTestId('btn-submit-auth')).toHaveTextContent(/Create Account & Sync/i);
  });

  it('displays user profile, last sync time, and trigger buttons when logged in', async () => {
    const handleSyncNow = vi.fn().mockResolvedValue({ status: 'success', pushed: 2, pulled: 1 });
    const handleLogout = vi.fn();

    render(
      <CloudSyncModal
        isOpen={true}
        onClose={vi.fn()}
        user={{ id: 'usr-123', email: 'user@monefy.com', name: 'Monefy User' }}
        lastSyncTime="2026-10-15T12:00:00Z"
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        onSyncNow={handleSyncNow}
        onLogout={handleLogout}
      />
    );

    expect(screen.getByText('user@monefy.com')).toBeInTheDocument();
    expect(screen.getByText(/Cloud Account Connected/i)).toBeInTheDocument();

    // Trigger Sync Now
    const syncBtn = screen.getByTestId('btn-sync-now');
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(handleSyncNow).toHaveBeenCalledTimes(1);
    });

    // Trigger Logout
    const logoutBtn = screen.getByTestId('btn-logout-cloud');
    fireEvent.click(logoutBtn);
    expect(handleLogout).toHaveBeenCalledTimes(1);
  });
});
