import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App, { App as NamedApp } from '../App';

describe('App Root Component', () => {
  it('renders root App and default export without throwing', async () => {
    const { unmount } = render(<App />);
    await waitFor(() => {
      expect(screen.getByText('AI Monefy')).toBeInTheDocument();
    });
    unmount();

    render(<NamedApp />);
    await waitFor(() => {
      expect(screen.getByText('AI Monefy')).toBeInTheDocument();
    });
  });
});
