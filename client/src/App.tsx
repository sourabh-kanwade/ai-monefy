import React from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { WalkingSkeletonView } from './components/skeleton/WalkingSkeletonView';

export const App: React.FC = () => {
  return (
    <FinanceProvider>
      <WalkingSkeletonView />
    </FinanceProvider>
  );
};

export default App;
