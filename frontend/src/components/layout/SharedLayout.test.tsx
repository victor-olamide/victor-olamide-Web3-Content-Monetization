import { render, screen } from '@testing-library/react';
import { SharedLayout } from './SharedLayout';

jest.mock('./Header', () => ({
  Header: () => <div>Mocked Header</div>,
}));

jest.mock('./Footer', () => ({
  Footer: () => <div>Mocked Footer</div>,
}));

describe('SharedLayout', () => {
  it('renders header, footer, and children when shell is visible', () => {
    render(
      <SharedLayout>
        <div>Child Content</div>
      </SharedLayout>
    );

    expect(screen.getByText('Mocked Header')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
    expect(screen.getByText('Mocked Footer')).toBeInTheDocument();
  });

  it('renders only children when hideShell is true', () => {
    render(
      <SharedLayout hideShell>
        <div>Minimal Content</div>
      </SharedLayout>
    );

    expect(screen.queryByText('Mocked Header')).not.toBeInTheDocument();
    expect(screen.queryByText('Mocked Footer')).not.toBeInTheDocument();
    expect(screen.getByText('Minimal Content')).toBeInTheDocument();
  });
});
