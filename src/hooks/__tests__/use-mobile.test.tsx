import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

// Mock window.matchMedia
const mockMatchMedia = jest.fn();

describe('useIsMobile', () => {
  beforeEach(() => {
    // Reset the mock
    mockMatchMedia.mockReset();
    
    // Setup matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
  });

  afterEach(() => {
    // Clean up
    jest.restoreAllMocks();
  });

  test('should return false for desktop width', () => {
    const mockAddEventListener = jest.fn();
    const mockRemoveEventListener = jest.fn();

    mockMatchMedia.mockReturnValue({
      matches: false,
      addListener: mockAddEventListener,
      removeListener: mockRemoveEventListener,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    // Mock window.innerWidth for desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
    expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 767px)');
  });

  test('should return true for mobile width', () => {
    const mockAddEventListener = jest.fn();
    const mockRemoveEventListener = jest.fn();

    mockMatchMedia.mockReturnValue({
      matches: true,
      addListener: mockAddEventListener,
      removeListener: mockRemoveEventListener,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    // Mock window.innerWidth for mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 400,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  test('should handle window resize events', () => {
    let changeHandler: () => void;

    const mockAddEventListener = jest.fn().mockImplementation((type, handler) => {
      if (type === 'change') {
        changeHandler = handler;
      }
    });
    const mockRemoveEventListener = jest.fn();

    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    // Initially desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate window resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 400,
    });

    act(() => {
      changeHandler();
    });

    expect(result.current).toBe(true);
  });

  test('should clean up event listeners on unmount', () => {
    const mockAddEventListener = jest.fn();
    const mockRemoveEventListener = jest.fn();

    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { unmount } = renderHook(() => useIsMobile());

    expect(mockAddEventListener).toHaveBeenCalled();

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalled();
  });
});