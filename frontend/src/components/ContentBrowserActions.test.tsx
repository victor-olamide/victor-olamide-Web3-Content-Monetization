/**
 * Tests for ContentBrowserActions component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentBrowserActions } from './ContentBrowserActions';

const sampleItems = [
  {
    contentId: 1,
    title: 'First Content',
    description: 'A great first piece of content.',
    contentType: 'video',
    price: 10,
    views: 120,
    revenue: 45.5,
    purchases: 8,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    creator: 'creator1',
  },
  {
    contentId: 2,
    title: 'Second Article',
    description: 'Helpful article with strong guidance.',
    contentType: 'article',
    price: 5,
    views: 28,
    revenue: 12.75,
    purchases: 4,
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-04T00:00:00Z',
    creator: 'creator1',
  },
];

describe('ContentBrowserActions', () => {
  it('renders export and stats buttons', () => {
    render(<ContentBrowserActions items={sampleItems} />);

    expect(screen.getByRole('button', { name: /export.*csv/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export.*json/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stats/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('displays statistics when stats button is clicked', async () => {
    render(<ContentBrowserActions items={sampleItems} />);
    const user = userEvent.setup();

    const statsButton = screen.getByRole('button', { name: /stats/i });
    await user.click(statsButton);

    await waitFor(() => {
      expect(screen.getByText('Total Items')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    expect(screen.getByText(/total views/i)).toBeInTheDocument();
    expect(screen.getByText(/total purchases/i)).toBeInTheDocument();
    expect(screen.getByText(/avg price/i)).toBeInTheDocument();
    expect(screen.getByText(/total revenue/i)).toBeInTheDocument();
  });

  it('hides statistics when stats button is clicked again', async () => {
    render(<ContentBrowserActions items={sampleItems} />);
    const user = userEvent.setup();

    const statsButton = screen.getByRole('button', { name: /stats/i });

    // Show stats
    await user.click(statsButton);
    await waitFor(() => {
      expect(screen.getByText('Total Items')).toBeInTheDocument();
    });

    // Hide stats
    await user.click(statsButton);
    await waitFor(() => {
      expect(screen.queryByText('Total Items')).not.toBeInTheDocument();
    });
  });

  it('disables export buttons when no items available', () => {
    render(<ContentBrowserActions items={[]} />);

    const csvButton = screen.getByRole('button', { name: /export.*csv/i });
    const jsonButton = screen.getByRole('button', { name: /export.*json/i });

    expect(csvButton).toBeDisabled();
    expect(jsonButton).toBeDisabled();
  });

  it('displays selection info when items are selected', () => {
    render(<ContentBrowserActions items={sampleItems} selectedIds={[1]} />);

    expect(screen.getByText(/1 item selected for export/i)).toBeInTheDocument();
  });

  it('displays plural selection info for multiple selections', () => {
    render(<ContentBrowserActions items={sampleItems} selectedIds={[1, 2]} />);

    expect(screen.getByText(/2 items selected for export/i)).toBeInTheDocument();
  });

  it('calls refresh callback when refresh button is clicked', async () => {
    const refreshMock = jest.fn().mockResolvedValue(undefined);
    render(<ContentBrowserActions items={sampleItems} onRefresh={refreshMock} />);
    const user = userEvent.setup();

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
  });

  it('displays loading state on refresh button when isLoading is true', () => {
    render(<ContentBrowserActions items={sampleItems} isLoading={true} />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeDisabled();
  });

  it('calculates and displays correct statistics', async () => {
    render(<ContentBrowserActions items={sampleItems} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /stats/i }));

    await waitFor(() => {
      // Total items
      expect(screen.getByText('2')).toBeInTheDocument();
      // Total views: 120 + 28 = 148
      expect(screen.getByText('148')).toBeInTheDocument();
      // Total purchases: 8 + 4 = 12
      expect(screen.getByText('12')).toBeInTheDocument();
      // Avg price: (10 + 5) / 2 = 7.50
      expect(screen.getByText('7.50')).toBeInTheDocument();
      // Total revenue: 45.5 + 12.75 = 58.25
      expect(screen.getByText('58.25')).toBeInTheDocument();
    });
  });
});
