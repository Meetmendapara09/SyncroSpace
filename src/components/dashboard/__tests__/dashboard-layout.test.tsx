import { render, screen } from '@testing-library/react';
import { DashboardLayout } from '../dashboard-layout';

describe('DashboardLayout', () => {
  test('should render children correctly', () => {
    render(
      <DashboardLayout>
        <div data-testid="child-content">Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('should render with proper container structure', () => {
    const { container } = render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    const mainContainer = container.querySelector('.container');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass('py-8', 'space-y-8');
  });

  test('should include theme toggle and dashboard switch', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Check for fixed positioning div that should contain ThemeToggle
    const fixedDiv = document.querySelector('.fixed.top-24.right-8.z-10');
    expect(fixedDiv).toBeInTheDocument();

    // Check for margin bottom div that should contain DashboardSwitch
    const mbDiv = document.querySelector('.mb-6');
    expect(mbDiv).toBeInTheDocument();
  });
});