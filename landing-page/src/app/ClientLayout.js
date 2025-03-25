"use client";

import { useState, useEffect } from 'react';

export default function ClientLayout({ children }) {
  const [isClient, setIsClient] = useState(false);
 
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
      {/* You can use isClient state here as needed */}
      {children}
    </>
  );
} 