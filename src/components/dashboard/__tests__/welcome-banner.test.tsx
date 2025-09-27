import { render, screen } from '@testing-library/react';
import { WelcomeBanner } from '../welcome-banner';

// Mock Firebase hooks
jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: jest.fn(() => [
    { 
      uid: 'test-user-id',
      displayName: 'Test User',
      email: 'test@example.com'
    }, 
    false, 
    null
  ]),
}));

// Mock hooks
jest.mock('@/hooks/use-dashboard-preferences', () => ({
  useDashboardPreferences: jest.fn(() => ({
    preferences: { showWelcomeBanner: true },
    updatePreferences: jest.fn(),
  })),
}));

describe('WelcomeBanner', () => {
  test('should render welcome message for authenticated user', () => {
    render(<WelcomeBanner />);
    
    // Check for the actual welcome message that is rendered
    expect(screen.getByText(/good afternoon/i)).toBeInTheDocument();
    expect(screen.getByText(/welcome to your personalized dashboard/i)).toBeInTheDocument();
  });

  test('should render action links', () => {
    render(<WelcomeBanner />);
    
    // Look for links instead of buttons - the banner has action links
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    
    // Check for specific action links
    expect(screen.getByText('Check today\'s meetings')).toBeInTheDocument();
    expect(screen.getByText('View your tasks')).toBeInTheDocument();
    expect(screen.getByText('Customize dashboard')).toBeInTheDocument();
  });

  test('should have proper card structure', () => {
    const { container } = render(<WelcomeBanner />);
    
    // Should have a card-like structure
    const cardElement = container.querySelector('[class*="border"]');
    expect(cardElement).toBeInTheDocument();
  });
});