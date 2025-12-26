import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AddressInput from '../AddressInput';

// Mock fetch
global.fetch = jest.fn();

describe('AddressInput', () => {
  const mockOnAddAddress = jest.fn();
  const defaultProps = {
    onAddAddress: mockOnAddAddress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the input field', () => {
    render(<AddressInput {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Search Berlin address.../i)).toBeInTheDocument();
  });

  it('fetches suggestions when typing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              name: 'Alexanderplatz',
              city: 'Berlin',
              postcode: '10178',
            },
            geometry: {
              coordinates: [13.413215, 52.521918],
            },
          },
        ],
      }),
    });

    render(<AddressInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Search Berlin address.../i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Alex' } });
    });

    // Wait for debounce (if any) or effect
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(screen.getByText(/Alexanderplatz/)).toBeInTheDocument();
  });

  it('filters out non-Berlin addresses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              name: 'Some Place in Potsdam',
              city: 'Potsdam',
              postcode: '14467',
            },
            geometry: { coordinates: [13.0, 52.0] },
          },
          {
            properties: {
              name: 'Valid Berlin Place',
              city: 'Berlin',
              postcode: '10115',
            },
            geometry: { coordinates: [13.4, 52.5] },
          },
        ],
      }),
    });

    render(<AddressInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Search Berlin address.../i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Test' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Valid Berlin Place/)).toBeInTheDocument();
      expect(screen.queryByText('Some Place in Potsdam')).not.toBeInTheDocument();
    });
  });

  it('adds an address when a suggestion is clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              name: 'Alexanderplatz',
              city: 'Berlin',
              postcode: '10178',
            },
            geometry: {
              coordinates: [13.413215, 52.521918],
            },
          },
        ],
      }),
    });

    render(<AddressInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Search Berlin address.../i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Alex' } });
    });

    await waitFor(() => {
      screen.getByText(/Alexanderplatz/);
    });

    fireEvent.click(screen.getByText(/Alexanderplatz/));

    expect(mockOnAddAddress).toHaveBeenCalled();
    const newAddress = mockOnAddAddress.mock.calls[0][0];
    expect(newAddress.fullAddress).toContain('Alexanderplatz');
  });
});
