import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { FamilyTree } from './types';
import { FamilyTreeCanvas } from './FamilyTreeCanvas';
import { saveFamilyTree, loadFamilyTree, exportFamilyTree, importFamilyTree } from './storage';

// Utility function to detect mobile devices
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
};

function App() {
  const [familyTree, setFamilyTree] = useState<FamilyTree>({ people: [], relationships: [] });
  const canvasResetRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const saved = loadFamilyTree();
    setFamilyTree(saved);
    // Reset view to origin when loading
    setTimeout(() => canvasResetRef.current?.(), 100);
  }, []);

  useEffect(() => {
    saveFamilyTree(familyTree);
  }, [familyTree]);

  const handleImport = async () => {
    try {
      const imported = await importFamilyTree();
      setFamilyTree(imported);
      // Reset view to origin when importing
      setTimeout(() => canvasResetRef.current?.(), 100);
    } catch (error) {
      alert('Failed to import file: ' + (error as Error).message);
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all data?')) {
      setFamilyTree({ people: [], relationships: [] });
      // Reset view to origin when clearing
      setTimeout(() => canvasResetRef.current?.(), 100);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-title">
          <h1>Family Tree Builder</h1>
          <span className="version-info">
            {isMobile() ? "Mobile" : "Desktop"} | trvdition v0.0.1
          </span>
        </div>
        <div className="header-actions">
          <button onClick={() => exportFamilyTree(familyTree)}>
            Export Tree
          </button>
          <button onClick={handleImport}>
            Import Tree
          </button>
          <button onClick={handleClear} className="danger">
            Clear All
          </button>
          {isMobile() && (
            <button onClick={() => window.location.href = './mobile/index.html'}>
              📱 Mobile Version
            </button>
          )}
        </div>
      </header>
      
      <main>
        <FamilyTreeCanvas 
          familyTree={familyTree}
          onFamilyTreeUpdate={setFamilyTree}
          onResetViewReady={(resetFn) => { canvasResetRef.current = resetFn; }}
        />
      </main>
    </div>
  );
}

export default App;
