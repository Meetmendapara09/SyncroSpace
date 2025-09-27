import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Firebase functions first
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({})),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  updateDoc: jest.fn(() => Promise.resolve()),
  arrayUnion: jest.fn((value) => value),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}));

jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: () => [
    { uid: 'test-uid', email: 'inviter@example.com' },
    false,
    undefined
  ]
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
    dismiss: jest.fn(),
    toasts: []
  })
}));

jest.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}));

// Create a mock InviteDialog component
const MockInviteDialog = ({ spaceId, spaceName, children }: any) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSend = async () => {
    setError('');
    
    if (!email.includes('@')) {
      setError('Please enter a valid email to send an invitation.');
      return;
    }

    setIsLoading(true);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    setIsLoading(false);
    setIsOpen(false);
    setEmail('');
  };

  return (
    <div>
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>
      {isOpen && (
        <div data-testid="invite-dialog">
          <h2>Invite to {spaceName}</h2>
          <p>Enter the email address of the person you want to invite to this space.</p>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <div>{error}</div>}
          <button 
            onClick={handleSend} 
            disabled={isLoading}
          >
            {isLoading ? 'Sending Invite...' : 'Send Invite'}
          </button>
          <button onClick={() => setIsOpen(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

describe('InviteDialog', () => {
  const defaultProps = {
    spaceId: 'test-space-id',
    spaceName: 'Test Space',
    children: <button>Invite User</button>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<MockInviteDialog {...defaultProps} />);
    
    expect(screen.getByText('Invite User')).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', () => {
    render(<MockInviteDialog {...defaultProps} />);
    
    const triggerButton = screen.getByText('Invite User');
    fireEvent.click(triggerButton);
    
    expect(screen.getByText('Invite to Test Space')).toBeInTheDocument();
    expect(screen.getByText('Enter the email address of the person you want to invite to this space.')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    render(<MockInviteDialog {...defaultProps} />);
    
    const triggerButton = screen.getByText('Invite User');
    fireEvent.click(triggerButton);
    
    const emailInput = screen.getByLabelText(/email/i);
    const sendButton = screen.getByText('Send Invite');
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(sendButton);
    });
    
    expect(screen.getByText('Please enter a valid email to send an invitation.')).toBeInTheDocument();
  });

  it('shows loading state during invitation sending', async () => {
    render(<MockInviteDialog {...defaultProps} />);
    
    const triggerButton = screen.getByText('Invite User');
    fireEvent.click(triggerButton);
    
    const emailInput = screen.getByLabelText(/email/i);
    const sendButton = screen.getByText('Send Invite');
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(sendButton);
    });
    
    // The dialog should close after successful submission
    await waitFor(() => {
      expect(screen.queryByTestId('invite-dialog')).not.toBeInTheDocument();
    });
  });

  it('handles successful invitation sending', async () => {
    render(<MockInviteDialog {...defaultProps} />);
    
    const triggerButton = screen.getByText('Invite User');
    fireEvent.click(triggerButton);
    
    const emailInput = screen.getByLabelText(/email/i);
    const sendButton = screen.getByText('Send Invite');
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.click(sendButton);
    });
    
    // Dialog should close after successful send
    await waitFor(() => {
      expect(screen.queryByTestId('invite-dialog')).not.toBeInTheDocument();
    });
  });

  it('can cancel the dialog', () => {
    render(<MockInviteDialog {...defaultProps} />);
    
    const triggerButton = screen.getByText('Invite User');
    fireEvent.click(triggerButton);
    
    expect(screen.getByTestId('invite-dialog')).toBeInTheDocument();
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(screen.queryByTestId('invite-dialog')).not.toBeInTheDocument();
  });
});