import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BookingForm } from '../BookingForm';

jest.mock('../../services/api', () => ({
  serviceService: {
    getById: jest.fn(() => Promise.resolve({ data: {
      id: 's1',
      name: 'Haircut',
      duration: 30,
      business: { id: 'b1', name: 'Salon' },
      description: 'd',
      customFields: [
        { fieldName: 'Color', fieldType: 'select', isRequired: true, options: ['Red','Blue'] },
      ]
    }})),
    getAvailableSlots: jest.fn(() => Promise.resolve({ data: [] })),
  },
  bookingService: { create: jest.fn(() => Promise.resolve({})) }
}));

describe('BookingForm', () => {
  const renderWithProviders = (path = '/book/s1') => {
    const client = new QueryClient();
    return render(
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <Routes>
            <Route path="/book/:serviceId" element={<BookingForm />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>,
      { wrapper: ({ children }) => <div>{children}</div> }
    );
  };

  it('renders custom fields section when service has customFields', async () => {
    // Navigate to route
    window.history.pushState({}, 'Test', '/book/s1');
    renderWithProviders();

    await waitFor(() => expect(screen.getByText(/Book Service/i)).toBeInTheDocument());

    // Custom fields title
    await waitFor(() => expect(screen.getByText(/Additional Information/i)).toBeInTheDocument());
    // Field label
    expect(screen.getByText('Color')).toBeInTheDocument();
  });
});


