import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import chatReducer from '../../../space/client/src/app/features/chat/chatSlice';

// Mock the Phaser game
jest.mock('../../../space/client/src/game/main', () => ({
  scene: {
    keys: {
      GameScene: {
        disableKeys: jest.fn(),
        enableKeys: jest.fn(),
        addNewGlobalChatMessage: jest.fn(),
        addNewOfficeChatMessage: jest.fn(),
      },
    },
  },
}));

// Mock the icons
jest.mock('../../../space/client/src/components/icons/SentIcon', () => {
  return function SentIcon() {
    return <svg data-testid="sent-icon" />;
  };
});

// Mock the UI components
jest.mock('../../../space/client/src/components/ui/input', () => ({
  Input: React.forwardRef(({ className, ...props }: any, ref: any) => (
    <input ref={ref} className={className} {...props} data-testid="chat-input" />
  )),
}));

jest.mock('../../../space/client/src/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

// Import the component after mocking
import Chat from '../../../space/client/src/components/Chat';

const mockStore = configureStore({
  reducer: {
    chat: chatReducer,
  },
  preloadedState: {
    chat: {
      officeChatMessages: [],
      globalChatMessages: [
        { username: 'TestUser', message: 'Hello World', type: 'REGULAR_MESSAGE' as const },
      ],
      focused: false,
      showOfficeChat: false,
    },
  },
});

describe('Chat Component', () => {
  const mockSetShowChat = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chat component with global chat', () => {
    render(
      <Provider store={mockStore}>
        <Chat setShowChat={mockSetShowChat} />
      </Provider>
    );

    expect(screen.getByText('Global Chat')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('allows typing in the chat input', () => {
    render(
      <Provider store={mockStore}>
        <Chat setShowChat={mockSetShowChat} />
      </Provider>
    );

    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    expect(input).toHaveValue('Test message');
  });

  it('renders chat messages correctly', () => {
    render(
      <Provider store={mockStore}>
        <Chat setShowChat={mockSetShowChat} />
      </Provider>
    );

    expect(screen.getByText('TestUser:')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('has proper chat layout structure', () => {
    const { container } = render(
      <Provider store={mockStore}>
        <Chat setShowChat={mockSetShowChat} />
      </Provider>
    );

    // Check if main chat container exists
    const chatContainer = container.querySelector('.absolute');
    expect(chatContainer).toBeInTheDocument();
    expect(chatContainer).toHaveClass('right-3', 'top-3', 'bottom-3');
  });
});