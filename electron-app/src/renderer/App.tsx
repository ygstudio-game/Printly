import React, { useState, useEffect } from 'react';
import SetupForm from './SetupForm';
import Dashboard from './Dashboard';
import { Loader2 } from 'lucide-react';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Ask Main process if we are registered
      const status = await window.electron.checkRegistration();
      setIsRegistered(status.isRegistered);
    } catch (error) {
      console.error("Failed to check registration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
      </div>
    );
  }

  // If NOT registered -> Show Form
  if (!isRegistered) {
    return <SetupForm onComplete={() => setIsRegistered(true)} />;
  }

  // If Registered -> Show Dashboard
  return <Dashboard />;
};

export default App;
