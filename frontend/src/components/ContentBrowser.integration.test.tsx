/**
 * Integration tests for ContentBrowser and ContentBrowserActions
 * 
 * Tests the complete workflow of browsing, filtering, selecting, and exporting content
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentBrowser } from './ContentBrowser';

const sampleItems = [
  {
    contentId: 1,
    title: 'Video Tutorial',
    description: 'Learn React hooks',
    contentType: 'video',
    price: 10,
    views: 500,
    revenue: 200,
    purchases: 20,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    url: 'https://example.com/video',
  },
  {
    contentId: 2,
    title: 'Code Article',
    description: 'TypeScript best practices',
    contentType: 'article',
    price: 5,
    views: 300,
    revenue: 75,
    purchases: 15,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-14T00:00:00Z',
    url: 'https://example.com/article',
  },
  {
    contentId: 3,
    title: 'Design Assets',
    description: 'UI kit and components',
    contentType: 'image',
    price: 20,
    views: 200,
    revenue: 160,
    purchases: 8,
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-13T00:00:00Z',
    url: 'https://example.com/assets',
  },
  {
    contentId: 4,
    title: 'Ambient Music',
    description: 'Focus study beats',
    contentType: 'music',
    price: 3,
    views: 800,
    revenue: 120,
    purchases: 40,
    createdAt: '2026-01-04T00:00:00Z',
    updatedAt: '2026-01-12T00:00:00Z',
    url: 'https://example.com/music',
  },
];

describe('ContentBrowser Integration Tests', () => {
  it('displays all content items initially', () => {
    render(<ContentBrowser items={sampleItems} />);

    expect(screen.getByText('Video Tutorial')).toBeInTheDocument();
    expect(screen.getByText('Code Article')).toBeInTheDocument();
    expect(screen.getByText('Design Assets')).toBeInTheDocument();
    expect(screen.getByText('Ambient Music')).toBeInTheDocument();
    expect(screen.getByText('Showing 4 of 4 items')).toBeInTheDocument();
  });

  it('applies multiple filters independently', async () => {
    render(<ContentBrowser items={sampleItems} />);
    const user = userEvent.setup();

    // Filter by video type
    await user.selectOptions(screen.getByRole('combobox', { name: /filter/i }), 'video');

    await waitFor(() => {
      expect(screen.getByText('Video Tutorial')).toBeInTheDocument();
      expect(screen.getByText('Showing 1 of 4 items')).toBeInTheDocument();
    });

    expect(screen.queryByText('Code Article')).not.toBeInTheDocument();
  });

  it('combines search and filter operations', async () => {
    render(<ContentBrowser items={sampleItems} />);
    const user = userEvent.setup();

    // Apply type filter first
    await user.selectOptions(screen.getByRole('combobox', { name: /filter/i }), 'article');

    await waitFor(() => {
      expect(screen.getByText('Code Article')).toBeInTheDocument();
      expect(screen.getByText('Showing 1 of 4 items')).toBeInTheDocument();
    });

    // Now apply search
    await user.type(screen.getByPlaceholderText('Search by title or description...'), 'typescript');

    await waitFor(() => {
      expect(screen.getByText('Code Article')).toBeInTheDocument();
      expect(screen.getByText('Showing 1 of 4 items')).toBeInTheDocument();
    });

    // Search for something that doesn't match
    const searchInput = screen.getByPlaceholderText('Search by title or description...');
    await user.clear(searchInput);
    await user.type(searchInput, 'video');

    await waitFor(() => {
      expect(screen.queryByText('Code Article')).not.toBeInTheDocument();
      expect(screen.getByText('Showing 0 of 4 items')).toBeInTheDocument();
    });
  });

  it('sorts content and maintains filters', async () => {
    render(<ContentBrowser items={sampleItems} />);
    const user = userEvent.setup();

    // Set video filter
    await user.selectOptions(screen.getByRole('combobox', { name: /filter/i }), 'video');

    await waitFor(() => {
      expect(screen.getByText('Video Tutorial')).toBeInTheDocument();
    });

    // Sort by revenue (should have no effect since only 1 item)
    await user.click(screen.getByRole('button', { name: /sort by revenue/i }));

    await waitFor(() => {
      expect(screen.getByText('Video Tutorial')).toBeInTheDocument();
      expect(screen.getByText('Showing 1 of 4 items')).toBeInTheDocument();
    });
  });

  it('allows clearing filters to reset view', async () => {
    render(<ContentBrowser items={sampleItems} />);
    const user = userEvent.setup();

    // Apply filter and search
    await user.selectOptions(screen.getByRole('combobox', { name: /filter/i }), 'video');
    await user.type(screen.getByPlaceholderText('Search by title or description...'), 'react');

    await waitFor(() => {
      expect(screen.getByText('Showing 1 of 4 items')).toBeInTheDocument();
    });

    // Clear filters
    await user.click(screen.getByRole('button', { name: /clear filters/i }));

    await waitFor(() => {
      expect(screen.getByText('Showing 4 of 4 items')).toBeInTheDocument();
      expect(screen.getByText('Video Tutorial')).toBeInTheDocument();
      expect(screen.getByText('Code Article')).toBeInTheDocument();
      expect(screen.getByText('Design Assets')).toBeInTheDocument();
      expect(screen.getByText('Ambient Music')).toBeInTheDocument();
    });
  });

  it('handles delete action with confirmation', async () => {
    const deleteMock = jest.fn().mockResolvedValue(true);
    render(<ContentBrowser items={sampleItems} onDelete={deleteMock} />);
    const user = userEvent.setup();

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    
    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('Delete "Video Tutorial"? This cannot be undone.');
  });

  it('performs sorting across all content types correctly', async () => {
    render(<ContentBrowser items={sampleItems} />);
    const user = userEvent.setup();

    // Sort by views (Ambient Music should be first: 800 views)
    await user.click(screen.getByRole('button', { name: /sort by views/i }));

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // Header row + 4 content rows
      expect(rows.length).toBe(5);
    });
  });

  it('handles empty search results gracefully', async () => {
    render(<ContentBrowser items={sampleItems} />);
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText('Search by title or description...'),
      'nonexistent content'
    );

    await waitFor(() => {
      expect(screen.getByText(/no content matches your filters/i)).toBeInTheDocument();
      expect(screen.getByText('Showing 0 of 4 items')).toBeInTheDocument();
    });
  });

  it('maintains sort state across filter changes', async () => {
    render(<ContentBrowser items={sampleItems} />);
    const user = userEvent.setup();

    // Sort by revenue descending
    await user.click(screen.getByRole('button', { name: /sort by revenue/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sort by revenue/i })).toHaveAttribute(
        'aria-sort',
        'descending'
      );
    });

    // Now apply a filter
    await user.selectOptions(screen.getByRole('combobox', { name: /filter/i }), 'video');

    // Revenue sort should still be active
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sort by revenue/i })).toHaveAttribute(
        'aria-sort',
        'descending'
      );
    });
  });
});
