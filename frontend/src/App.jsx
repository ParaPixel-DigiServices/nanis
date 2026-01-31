import React from 'react';
// 1. Import the image to let Vite/Webpack handle the path
import bgImage from './assets/bg.png';
import SignUpScreen from './features/auth/SignUpScreen'; 

function App() {
  return (
    // 2. Apply styles inline for the image, and Tailwind for the layout
    <main 
      className="w-full min-h-screen flex flex-col bg-cover bg-center bg-no-repeat bg-fixed overflow-x-hidden"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <SignUpScreen />
      
    </main>
  );
}

export default App;