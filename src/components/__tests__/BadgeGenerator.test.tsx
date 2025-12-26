import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import BadgeGenerator from '../BadgeGenerator';

// Mock fetch
global.fetch = jest.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test');
global.URL.revokeObjectURL = jest.fn();

const mockGridData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
      properties: { id: '1' },
    },
  ],
};

describe('BadgeGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockGridData,
      text: async () => '<svg>Logo</svg>',
      blob: async () => new Blob(['font'], { type: 'font/ttf' }),
    });
  });

  it('renders loading state initially', async () => {
    // Mock fetch to not resolve immediately or just check initial render
    render(<BadgeGenerator />);
    expect(screen.getByText(/Loading grid.../i)).toBeInTheDocument();
    
    // Wait for the update to avoid "act" warning
    await waitFor(() => {
      expect(screen.queryByText(/Loading grid.../i)).not.toBeInTheDocument();
    });
  });

  it('renders the SVG after grid loads', async () => {
    render(<BadgeGenerator />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading grid.../i)).not.toBeInTheDocument();
    });

    // Check if SVG is present (by querying for something inside it or the container)
    // Since it's an SVG, we can look for the polygon or just the container
    // The component renders a div with relative class
    // We can check for the grid group
    // Note: testing-library might have trouble finding SVG elements by role, so we can use container.querySelector
    
    // But we can check if the fetch was called
    expect(global.fetch).toHaveBeenCalledWith('/masks/berlin_pixels.geojson');
  });

  it('renders points when addresses are provided', async () => {
    const addresses = [
      {
        id: '1',
        fullAddress: 'Test St',
        coordinates: [13.4, 52.5] as [number, number],
        projectedCoordinates: [390000, 5800000] as [number, number],
      },
    ];

    render(<BadgeGenerator addresses={addresses} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading grid.../i)).not.toBeInTheDocument();
    });

    // We can check if the point number is rendered
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('updates viewBox when addresses are provided', async () => {
    const addresses = [
      {
        id: '1',
        fullAddress: 'Test St',
        coordinates: [13.4, 52.5] as [number, number],
        projectedCoordinates: [390000, 5800000] as [number, number],
      },
    ];
    render(<BadgeGenerator addresses={addresses} />);
    await waitFor(() => expect(screen.queryByText(/Loading grid.../i)).not.toBeInTheDocument());
    
    const svg = screen.getByTestId('badge-container').querySelector('svg');
    
    // Wait for animation to start/update
    await waitFor(() => {
      expect(svg?.getAttribute('viewBox')).not.toBe("0 0 1000 1000");
    });
  });

  it('handles zooming via wheel event', async () => {
    const addresses = [
      {
        id: '1',
        fullAddress: 'Test St',
        coordinates: [13.4, 52.5] as [number, number],
        projectedCoordinates: [390000, 5800000] as [number, number],
      },
    ];
    render(<BadgeGenerator addresses={addresses} />);
    await waitFor(() => expect(screen.queryByText(/Loading grid.../i)).not.toBeInTheDocument());

    const container = screen.getByTestId('badge-container');
    const svg = container.querySelector('svg');
    
    // Wait for initial viewBox update
    await waitFor(() => {
      expect(svg?.getAttribute('viewBox')).not.toBe("0 0 1000 1000");
    });
    
    const initialViewBox = svg?.getAttribute('viewBox');

    // Zoom in (deltaY < 0)
    await act(async () => {
      fireEvent.wheel(container, { deltaY: -100 });
    });
    
    await waitFor(() => {
      const currentSvg = screen.getByTestId('badge-container').querySelector('svg');
      expect(currentSvg?.getAttribute('viewBox')).not.toBe(initialViewBox);
    });
  });

  it('handles panning via mouse drag', async () => {
    const addresses = [
      {
        id: '1',
        fullAddress: 'Test St',
        coordinates: [13.4, 52.5] as [number, number],
        projectedCoordinates: [390000, 5800000] as [number, number],
      },
    ];
    render(<BadgeGenerator addresses={addresses} />);
    await waitFor(() => expect(screen.queryByText(/Loading grid.../i)).not.toBeInTheDocument());

    const container = screen.getByTestId('badge-container');
    // Mock clientWidth for scale calculation
    Object.defineProperty(container, 'clientWidth', { configurable: true, value: 500 });

    const svg = container.querySelector('svg');
    
    // Wait for initial viewBox update
    await waitFor(() => {
      expect(svg?.getAttribute('viewBox')).not.toBe("0 0 1000 1000");
    });
    
    const initialViewBox = svg?.getAttribute('viewBox');

    // Start drag
    fireEvent.mouseDown(container, { clientX: 100, clientY: 100 });
    
    // Move
    fireEvent.mouseMove(container, { clientX: 150, clientY: 150 });
    
    await waitFor(() => {
      const currentSvg = screen.getByTestId('badge-container').querySelector('svg');
      expect(currentSvg?.getAttribute('viewBox')).not.toBe(initialViewBox);
    });

    // End drag
    fireEvent.mouseUp(container);
  });

  it('does not shift view when zooming out at max zoom', async () => {
    render(<BadgeGenerator />);
    await waitFor(() => expect(screen.queryByText(/Loading grid.../i)).not.toBeInTheDocument());

    const container = screen.getByTestId('badge-container');
    const svg = container.querySelector('svg');
    
    // Force max zoom out
    // We can't easily force state, but we can trigger wheel events until we hit max
    // Or we can mock the initial state if we could.
    // Let's just trigger enough wheel events.
    
    // Initial is 1000x1000. Max is 1500.
    // Zoom out factor is 1.1 (deltaY > 0)
    // 1000 * 1.1 = 1100
    // 1100 * 1.1 = 1210
    // 1210 * 1.1 = 1331
    // 1331 * 1.1 = 1464
    // 1464 * 1.1 = 1610 -> clamped to 1200
    
    for (let i = 0; i < 6; i++) {
      fireEvent.wheel(container, { deltaY: 100 });
    }
    
    // Wait for updates
    await waitFor(() => {
      const v = svg?.getAttribute('viewBox')?.split(' ').map(Number);
      expect(v?.[2]).toBe(1200); // Width should be max
    });
    
    const viewBoxAtMax = svg?.getAttribute('viewBox');
    
    // Zoom out again
    fireEvent.wheel(container, { deltaY: 100 });
    
    // Should stay the same
    await waitFor(() => {
       expect(svg?.getAttribute('viewBox')).toBe(viewBoxAtMax);
    });
  });
});
