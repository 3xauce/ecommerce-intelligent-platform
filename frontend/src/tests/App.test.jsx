import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import App from '../App';
import authReducer from '../store/slices/authSlice';
import cartReducer from '../store/slices/cartSlice';
import muiTheme from '../theme/muiTheme';

function renderApp(initialEntries = ['/']) {
  const store = configureStore({ reducer: { auth: authReducer, cart: cartReducer } });
  return render(
    <Provider store={store}>
      <ThemeProvider theme={muiTheme}>
        <MemoryRouter initialEntries={initialEntries}>
          <App />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

describe('App', () => {
  it("affiche la page d'accueil sur /", () => {
    renderApp(['/']);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /plateforme e-commerce intelligente/i
    );
  });

  it('affiche le formulaire de connexion sur /login', () => {
    renderApp(['/login']);
    expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument();
  });

  it('redirige /profile vers /login quand non authentifié', () => {
    renderApp(['/profile']);
    expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument();
  });

  it('redirige /cart vers /login quand non authentifié', () => {
    renderApp(['/cart']);
    expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument();
  });

  it('redirige /orders vers /login quand non authentifié', () => {
    renderApp(['/orders']);
    expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument();
  });

  it('redirige /dashboard vers /login quand non authentifié', () => {
    renderApp(['/dashboard']);
    expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument();
  });

  it('redirige /admin vers /login quand non authentifié', () => {
    renderApp(['/admin']);
    expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument();
  });

  it('redirige /my-shop vers /login quand non authentifié', () => {
    renderApp(['/my-shop']);
    expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument();
  });

  it('affiche une page 404 sur une route inconnue', () => {
    renderApp(['/route-inexistante']);
    expect(screen.getByText('404')).toBeInTheDocument();
  });
});
