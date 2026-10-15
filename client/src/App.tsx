import React from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { MonefyDashboard } from './components/dashboard/MonefyDashboard';

export const App: React.FC = () => {
  return (
    <FinanceProvider>
      <MonefyDashboard />
    </FinanceProvider>
  );
};

export default App;
