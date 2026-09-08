import { useContext } from 'react';
import { NavigationContext, NavigationProvider } from './NavigationContext.jsx';

export { NavigationProvider };

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

export default useNavigation;
