
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders the button with its children', () => {
    render(<Button>Click Me</Button>);
    const buttonElement = screen.getByText(/Click Me/i);
    expect(buttonElement).toBeInTheDocument();
  });

  it('handles onClick events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const buttonElement = screen.getByText(/Click Me/i);
    fireEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when the disabled prop is true', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>Click Me</Button>);
    const buttonElement = screen.getByText(/Click Me/i);
    expect(buttonElement).toBeDisabled();
    fireEvent.click(buttonElement);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies different variants', () => {
    render(<Button variant="destructive">Destructive</Button>);
    const buttonElement = screen.getByText(/Destructive/i);
    expect(buttonElement).toHaveClass('bg-destructive');
  });

  it('applies different sizes', () => {
    render(<Button size="lg">Large Button</Button>);
    const buttonElement = screen.getByText(/Large Button/i);
    expect(buttonElement).toHaveClass('h-11');
  });
});
