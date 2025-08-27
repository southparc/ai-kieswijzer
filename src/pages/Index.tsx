import { useState } from "react";
import { LandingPage } from "@/components/LandingPage";
import { AdvicePage } from "@/components/AdvicePage";
import { AdminPage } from "@/components/AdminPage";

type AppState = "landing" | "advice" | "admin";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("landing");

  const handleStart = () => {
    setAppState("advice");
  };

  const handleBackToLanding = () => {
    setAppState("landing");
  };

  const handleGoToAdmin = () => {
    setAppState("admin");
  };

  // Check for admin access via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const showAdmin = urlParams.get('admin') === 'true';

  switch (appState) {
    case "landing":
      return (
        <div>
          <LandingPage onStart={handleStart} />
          {showAdmin && (
            <div className="fixed bottom-4 right-4">
              <button
                onClick={handleGoToAdmin}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
              >
                Admin
              </button>
            </div>
          )}
        </div>
      );
    
    case "advice":
      return <AdvicePage onBack={handleBackToLanding} />;
    
    case "admin":
      return <AdminPage onBack={handleBackToLanding} />;
    
    default:
      return <LandingPage onStart={handleStart} />;
  }
};

export default Index;