import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MeetingEffectivenessMetrics } from './meeting-effectiveness-metrics';

describe('MeetingEffectivenessMetrics', () => {
  const defaultProps = {
    meetingId: 'test-meeting-id'
  };

  it('renders the meeting effectiveness metrics card', () => {
    render(<MeetingEffectivenessMetrics {...defaultProps} />);
    
    // Check for main title
    expect(screen.getByText('Meeting Effectiveness Score')).toBeInTheDocument();
    
    // Check for description text
    expect(screen.getByText(/Overall assessment of meeting productivity and efficiency/)).toBeInTheDocument();
  });

  it('displays overall effectiveness score', () => {
    render(<MeetingEffectivenessMetrics {...defaultProps} />);
    
    // Check for overall score
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('displays time utilization metrics', () => {
    render(<MeetingEffectivenessMetrics {...defaultProps} />);
    
    // Check for time utilization
    expect(screen.getByText('Time Utilization')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText(/Meeting stayed on track/)).toBeInTheDocument();
  });

  it('displays participation metrics', () => {
    render(<MeetingEffectivenessMetrics {...defaultProps} />);
    
    // Check for participation rate
    expect(screen.getByText('Participation Rate')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText(/Active member engagement/)).toBeInTheDocument();
  });

  it('displays action items', () => {
    render(<MeetingEffectivenessMetrics {...defaultProps} />);
    
    // Check for action items
    expect(screen.getByText('Action Items')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/Items created for follow-up/)).toBeInTheDocument();
  });

  it('displays attendance metrics', () => {
    render(<MeetingEffectivenessMetrics {...defaultProps} />);
    
    // Check for attendance
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText(/Expected attendees present/)).toBeInTheDocument();
  });

  it('displays recommendations', () => {
    render(<MeetingEffectivenessMetrics {...defaultProps} />);
    
    // Check for recommendations section
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText(/Suggestions to improve future meetings/)).toBeInTheDocument();
    
    // Check for specific recommendations
    expect(screen.getByText(/Schedule follow-up meetings for action items/)).toBeInTheDocument();
    expect(screen.getByText(/Encourage participation from quiet members/)).toBeInTheDocument();
    expect(screen.getByText(/Consider shorter meeting duration/)).toBeInTheDocument();
  });

  it('renders with proper responsive design classes', () => {
    const { container } = render(<MeetingEffectivenessMetrics {...defaultProps} />);
    
    // Check if the main container has proper responsive classes
    const mainContainer = container.querySelector('.space-y-6');
    expect(mainContainer).toBeInTheDocument();
    
    const cards = container.querySelectorAll('.rounded-lg');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('displays progress bars with correct styling', () => {
    const { container } = render(<MeetingEffectivenessMetrics {...defaultProps} />);
    
    // Check for progress bar elements
    const progressBars = container.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });
});