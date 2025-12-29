import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../page';
import { Address } from '@/components/AddressInput';

// Mock child components to avoid complex setup
jest.mock('@/components/AddressInput', () => {
  return function MockAddressInput({ onAddAddress }: { onAddAddress: (address: Address) => void }) {
    return (
      <button onClick={() => onAddAddress({ id: '1', fullAddress: 'Test', coordinates: [0, 0], projectedCoordinates: [0, 0] })}>
        Add Address
      </button>
    );
  };
});

jest.mock('@/components/BadgeGenerator', () => {
  // eslint-disable-next-line react/display-name
  return React.forwardRef((_props: unknown, ref: React.Ref<SVGSVGElement>) => (
    <svg ref={ref} viewBox="0 0 100 100">
      <rect width="100" height="100" fill="red" />
    </svg>
  ));
});

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test');
global.URL.revokeObjectURL = jest.fn();

// Mock fetch for logo
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  text: async () => '<svg>Logo</svg>',
  blob: async () => new Blob(['font'], { type: 'font/ttf' }),
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Home Page', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('renders the title', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /EckeSchnecke/i })).toBeInTheDocument();
  });

  it('updates addresses when input changes', async () => {
    render(<Home />);
    const addButton = screen.getByText('Add Address');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'eckeschnecke-addresses',
        expect.stringContaining('"id":"1"')
      );
    });
  });

  it('loads addresses from local storage on mount', async () => {
    const savedAddresses = [{ id: 'saved', fullAddress: 'Saved St', coordinates: [0, 0], projectedCoordinates: [0, 0] }];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedAddresses));

    render(<Home />);
    
    // We can't easily check the state directly, but we can check if the mock AddressInput (which we might need to adjust)
    // or BadgeGenerator received it.
    // Or we can check if localStorage.getItem was called.
    expect(localStorageMock.getItem).toHaveBeenCalledWith('eckeschnecke-addresses');
  });


});
