import { useSelector } from 'react-redux';

export function useAuth() {
  const { user, status, error, bootstrapped } = useSelector((state) => state.auth);
  return {
    user,
    isAuthenticated: Boolean(user),
    isLoading: status === 'loading',
    error,
    bootstrapped,
  };
}
