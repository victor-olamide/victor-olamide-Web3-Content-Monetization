import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentBrowser } from './ContentBrowser';

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
    url: 'https://example.com/1',
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
    url: 'https://example.com/2',
  },
];

describe('ContentBrowser', () => {
  it('renders the content browser header and controls', () => {
    render(<ContentBrowser items={sampleItems} />);

    expect(screen.getByPlaceholderText('Search by title or description...')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /filter content type/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sort by date/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sort by views/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sort by revenue/i })).toBeInTheDocument();
  });

  it('filters content by type selection', async () => {
    render(<ContentBrowser items={sampleItems} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox', { name: /filter content type/i }), 'article');

    await waitFor(() => {
      expect(screen.getByText('Showing 1 of 2 items')).toBeInTheDocument();
    });

    expect(screen.getByText('Second Article')).toBeInTheDocument();
    expect(screen.queryByText('First Content')).not.toBeInTheDocument();
  });

  it('searches content items by title and description', async () => {
    render(<ContentBrowser items={sampleItems} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Search by title or description...'), 'helpful');

    await waitFor(() => {
      expect(screen.getByText('Showing 1 of 2 items')).toBeInTheDocument();
    });

    expect(screen.getByText('Second Article')).toBeInTheDocument();
    expect(screen.queryByText('First Content')).not.toBeInTheDocument();
  });

  it('displays the clear filters button when a search is active', async () => {
    render(<ContentBrowser items={sampleItems} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Search by title or description...'), 'first');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });
  });

  it('sorts content items by views and toggles order on repeated clicks', async () => {
    render(<ContentBrowser items={sampleItems} />);
    const user = userEvent.setup();
    const viewsSortButton = screen.getByRole('button', { name: /sort by views/i });

    await user.click(viewsSortButton);

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('First Content');
      expect(rows[2]).toHaveTextContent('Second Article');
    });

    await user.click(viewsSortButton);

    await waitFor(() => {
      const toggledRows = screen.getAllByRole('row');
      expect(toggledRows[1]).toHaveTextContent('Second Article');
      expect(toggledRows[2]).toHaveTextContent('First Content');
    });
  });

  it('shows an empty state when no items match and clears filters', async () => {
    render(<ContentBrowser items={sampleItems} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Search by title or description...'), 'missing');

    await waitFor(() => {
      expect(screen.getByText(/no content matches your filters/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear filters and search/i })).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /clear filters and search/i });
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 2 items')).toBeInTheDocument();
    });
  });
});
