import { render, screen } from '@testing-library/react';
import AuthLayout from '../layout';

describe('AuthLayout', () => {
  test('should render children correctly', () => {
    render(
      <AuthLayout>
        <div data-testid="auth-content">Login Form</div>
      </AuthLayout>
    );

    expect(screen.getByTestId('auth-content')).toBeInTheDocument();
    expect(screen.getByText('Login Form')).toBeInTheDocument();
  });

  test('should have proper grid layout structure', () => {
    const { container } = render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const gridContainer = container.querySelector('.w-full.lg\\:grid');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass('lg:min-h-dvh', 'lg:grid-cols-2');
  });

  test('should render marketing content', () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    expect(screen.getByText("Your Team's Digital Headquarters")).toBeInTheDocument();
    expect(screen.getByText(/SyncroSpace is more than a tool/)).toBeInTheDocument();
  });

  test('should have SyncroSpace logo/branding', () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    // Look for SyncroSpace branding in the marketing text
    expect(screen.getByText(/SyncroSpace is more than a tool/)).toBeInTheDocument();
  });

  test('should center the auth content', () => {
    const { container } = render(
      <AuthLayout>
        <div data-testid="auth-content">Content</div>
      </AuthLayout>
    );

    const centerDiv = container.querySelector('.flex.items-center.justify-center');
    expect(centerDiv).toBeInTheDocument();
    expect(centerDiv).toHaveClass('py-12');
  });

  test('should have background image on larger screens', () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('alt', 'Image');
  });
});