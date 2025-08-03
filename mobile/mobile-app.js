// Mobile Family Tree Builder - trvdition v0.0.1
// Optimized for touch devices with mobile-first design

const { useState, useEffect, useCallback, useRef } = React;
const { createRoot } = ReactDOM;

// Storage utilities (compatible with main app)
const STORAGE_KEY = 'familyTree';

const saveFamilyTree = (familyTree) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(familyTree));
  } catch (error) {
    console.error('Failed to save family tree:', error);
  }
};

const loadFamilyTree = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load family tree:', error);
  }
  return { people: [], relationships: [] };
};

const exportFamilyTree = (familyTree) => {
  const dataStr = JSON.stringify(familyTree, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `family-tree-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const importFamilyTree = () => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            resolve(data);
          } catch (error) {
            reject(new Error('Invalid JSON file'));
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  });
};

// Mobile-optimized Person Node Component
const MobilePersonNode = ({ 
  person, 
  onPersonUpdate, 
  onPersonDelete, 
  onPersonSelect,
  onConnectionStart,
  isSelected,
  isConnecting,
  connectionMode,
  scale = 1
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const nodeRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (isEditing) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    
    // Clear any existing timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    
    if (connectionMode) {
      // In connection mode, start connection immediately
      onConnectionStart(person.id, person.x + 60, person.y + 30);
    } else {
      // Set up for potential drag
      setDragStart({
        x: touch.clientX - person.x,
        y: touch.clientY - person.y
      });
      
      // Long press for edit (600ms)
      const timer = setTimeout(() => {
        setIsEditing(true);
        setLongPressTimer(null);
      }, 600);
      setLongPressTimer(timer);
    }
    
    onPersonSelect(person.id);
  }, [person, isEditing, connectionMode, longPressTimer, onConnectionStart, onPersonSelect]);

  const handleTouchMove = useCallback((e) => {
    if (isEditing || connectionMode) return;
    
    const touch = e.touches[0];
    const moveThreshold = 10;
    
    // Cancel long press if moved too much
    if (longPressTimer) {
      const deltaX = Math.abs(touch.clientX - (person.x + dragStart.x));
      const deltaY = Math.abs(touch.clientY - (person.y + dragStart.y));
      
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
        setIsDragging(true);
      }
    }
    
    if (isDragging) {
      const newX = Math.max(0, touch.clientX - dragStart.x);
      const newY = Math.max(0, touch.clientY - dragStart.y);
      
      // Snap to grid
      const gridSize = 20;
      const snappedX = Math.round(newX / gridSize) * gridSize;
      const snappedY = Math.round(newY / gridSize) * gridSize;
      
      onPersonUpdate({ 
        ...person, 
        x: snappedX, 
        y: snappedY 
      });
    }
  }, [person, isDragging, dragStart, longPressTimer, isEditing, connectionMode, onPersonUpdate]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsDragging(false);
  }, [longPressTimer]);

  const handleEditSubmit = useCallback((updatedPerson) => {
    onPersonUpdate(updatedPerson);
    setIsEditing(false);
  }, [onPersonUpdate]);

  const formatDateRange = () => {
    const birth = person.birthDate ? new Date(person.birthDate).getFullYear() : '';
    const death = person.deathDate ? new Date(person.deathDate).getFullYear() : '';
    
    if (birth && death) return `${birth} - ${death}`;
    if (birth) return `b. ${birth}`;
    if (death) return `d. ${death}`;
    return '';
  };

  const getGenderIcon = () => {
    switch (person.gender) {
      case 'male': return '♂';
      case 'female': return '♀';
      default: return '';
    }
  };

  if (isEditing) {
    return React.createElement(MobilePersonEditor, {
      person,
      onSubmit: handleEditSubmit,
      onCancel: () => setIsEditing(false),
      onDelete: () => {
        if (confirm('Delete this person?')) {
          onPersonDelete(person.id);
        }
      }
    });
  }

  const nodeStyle = {
    position: 'absolute',
    left: person.x,
    top: person.y,
    width: '120px',
    minHeight: '60px',
    background: 'white',
    border: `2px solid ${isSelected ? '#007bff' : '#dee2e6'}`,
    borderRadius: '12px',
    padding: '12px',
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
    transform: `scale(${scale}) ${isDragging ? 'rotate(2deg)' : ''}`,
    transformOrigin: 'center',
    transition: isDragging ? 'none' : 'all 0.2s ease',
    touchAction: 'none',
    userSelect: 'none',
    cursor: connectionMode ? 'crosshair' : 'grab',
    zIndex: isDragging ? 1000 : isSelected ? 100 : 1,
    animation: isConnecting ? 'pulse 1s infinite' : 'none'
  };

  return React.createElement('div', {
    ref: nodeRef,
    style: nodeStyle,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    'data-person-id': person.id
  }, [
    React.createElement('div', {
      key: 'name',
      style: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '4px'
      }
    }, `${getGenderIcon()} ${person.name}`),
    
    formatDateRange() && React.createElement('div', {
      key: 'dates',
      style: {
        fontSize: '11px',
        color: '#666'
      }
    }, formatDateRange())
  ]);
};

// Mobile Person Editor Component
const MobilePersonEditor = ({ person, onSubmit, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    name: person.name,
    birthDate: person.birthDate || '',
    deathDate: person.deathDate || '',
    gender: person.gender || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSubmit({ ...person, ...formData });
    }
  };

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  };

  const formStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '16px',
    marginBottom: '16px',
    fontFamily: 'inherit'
  };

  const buttonStyle = {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    marginRight: '8px',
    minHeight: '48px'
  };

  return React.createElement('div', { style: overlayStyle }, 
    React.createElement('form', { style: formStyle, onSubmit: handleSubmit }, [
      React.createElement('h3', { 
        key: 'title',
        style: { margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }
      }, 'Edit Person'),
      
      React.createElement('input', {
        key: 'name',
        type: 'text',
        placeholder: 'Name',
        value: formData.name,
        onChange: (e) => setFormData({...formData, name: e.target.value}),
        style: inputStyle
      }),
      
      React.createElement('input', {
        key: 'birth',
        type: 'date',
        placeholder: 'Birth Date',
        value: formData.birthDate,
        onChange: (e) => setFormData({...formData, birthDate: e.target.value}),
        style: inputStyle
      }),
      
      React.createElement('input', {
        key: 'death',
        type: 'date',
        placeholder: 'Death Date',
        value: formData.deathDate,
        onChange: (e) => setFormData({...formData, deathDate: e.target.value}),
        style: inputStyle
      }),
      
      React.createElement('select', {
        key: 'gender',
        value: formData.gender,
        onChange: (e) => setFormData({...formData, gender: e.target.value}),
        style: inputStyle
      }, [
        React.createElement('option', { key: 'none', value: '' }, 'Gender'),
        React.createElement('option', { key: 'male', value: 'male' }, 'Male'),
        React.createElement('option', { key: 'female', value: 'female' }, 'Female'),
        React.createElement('option', { key: 'other', value: 'other' }, 'Other')
      ]),
      
      React.createElement('div', {
        key: 'actions',
        style: { display: 'flex', gap: '8px', marginTop: '8px' }
      }, [
        React.createElement('button', {
          key: 'save',
          type: 'submit',
          style: { ...buttonStyle, background: '#007bff', color: 'white', flex: 1 }
        }, 'Save'),
        
        React.createElement('button', {
          key: 'cancel',
          type: 'button',
          onClick: onCancel,
          style: { ...buttonStyle, background: '#6c757d', color: 'white', flex: 1 }
        }, 'Cancel'),
        
        React.createElement('button', {
          key: 'delete',
          type: 'button',
          onClick: onDelete,
          style: { ...buttonStyle, background: '#dc3545', color: 'white', minWidth: '60px' }
        }, '🗑')
      ])
    ])
  );
};

// Mobile Canvas Component
const MobileCanvas = ({ children, onCanvasTouch, scale, offset, onOffsetChange, mode }) => {
  const canvasRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [lastTouchCenter, setLastTouchCenter] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [touchStartTime, setTouchStartTime] = useState(0);

  const getTouchDistance = (touches) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getTouchCenter = (touches) => {
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const handleTouchStart = useCallback((e) => {
    const target = e.target;
    setTouchStartTime(Date.now());
    
    // Don't handle if touching a person node
    if (target.closest('[data-person-id]')) {
      return;
    }
    
    if (e.touches.length === 1) {
      // Single touch - might be canvas tap or pan
      const touch = e.touches[0];
      setLastTouchCenter({ x: touch.clientX, y: touch.clientY });
      
      // Check if this is a canvas tap for add mode
      if (mode === 'add' && (target === canvasRef.current || target.closest('.canvas-content'))) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (touch.clientX - rect.left - offset.x) / scale;
        const y = (touch.clientY - rect.top - offset.y) / scale;
        onCanvasTouch(x, y);
        return;
      }
      
      // For navigate and connect modes, allow panning
      if (mode === 'navigate' || mode === 'connect') {
        setIsPanning(true);
      }
    } else if (e.touches.length === 2) {
      // Two finger touch - start zoom/pan
      e.preventDefault();
      setIsZooming(true);
      setIsPanning(false);
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    }
  }, [scale, offset, onCanvasTouch, mode]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && isPanning && (mode === 'navigate' || mode === 'connect')) {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastTouchCenter.x;
      const deltaY = touch.clientY - lastTouchCenter.y;
      
      onOffsetChange({
        x: offset.x + deltaX,
        y: offset.y + deltaY
      });
      
      setLastTouchCenter({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2 && isZooming) {
      // Handle pinch zoom (placeholder for future enhancement)
      e.preventDefault();
    }
  }, [isPanning, isZooming, lastTouchCenter, offset, onOffsetChange, mode]);

  const handleTouchEnd = useCallback((e) => {
    const touchDuration = Date.now() - touchStartTime;
    
    if (e.touches.length === 0) {
      setIsPanning(false);
      setIsZooming(false);
      
      // If it was a quick tap and not in add mode, might be for connect mode
      if (touchDuration < 200 && mode === 'connect' && !isPanning) {
        const target = e.target;
        if (target === canvasRef.current || target.closest('.canvas-content')) {
          // Cancel any active connection
          const rect = canvasRef.current.getBoundingClientRect();
          const touch = e.changedTouches[0];
          const x = (touch.clientX - rect.left - offset.x) / scale;
          const y = (touch.clientY - rect.top - offset.y) / scale;
          onCanvasTouch(x, y);
        }
      }
    }
  }, [touchStartTime, mode, isPanning, offset, scale, onCanvasTouch]);

  const canvasStyle = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    background: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)',
    backgroundSize: '20px 20px',
    touchAction: 'none'
  };

  const contentStyle = {
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    transformOrigin: '0 0',
    transition: isPanning || isZooming ? 'none' : 'transform 0.2s ease',
    width: '100%',
    height: '100%',
    position: 'relative'
  };

  return React.createElement('div', {
    ref: canvasRef,
    style: canvasStyle,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }, 
    React.createElement('div', {
      className: 'canvas-content',
      style: contentStyle
    }, children)
  );
};

// Mobile Menu Component
const MobileMenu = ({ isOpen, onClose, onExport, onImport, onClear, onDesktop }) => {
  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  };

  const menuStyle = {
    background: 'white',
    borderRadius: '16px 16px 0 0',
    width: '100%',
    maxWidth: '400px',
    padding: '24px',
    boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
    animation: 'slideUp 0.3s ease'
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '20px',
    textAlign: 'center',
    color: '#333'
  };

  const buttonStyle = {
    width: '100%',
    padding: '16px',
    margin: '8px 0',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: '#007bff',
    color: 'white'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: '#f8f9fa',
    color: '#495057',
    border: '1px solid #dee2e6'
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    background: '#dc3545',
    color: 'white'
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    background: '#6c757d',
    color: 'white',
    marginTop: '16px'
  };

  return React.createElement('div', { 
    style: overlayStyle,
    onClick: (e) => e.target === e.currentTarget && onClose()
  }, 
    React.createElement('div', { style: menuStyle }, [
      React.createElement('h3', { 
        key: 'title',
        style: titleStyle
      }, 'Menu'),
      
      React.createElement('button', {
        key: 'export',
        style: primaryButtonStyle,
        onClick: () => { onExport(); onClose(); }
      }, [
        React.createElement('span', { key: 'icon' }, '📁'),
        React.createElement('span', { key: 'text' }, 'Export Tree')
      ]),
      
      React.createElement('button', {
        key: 'import',
        style: secondaryButtonStyle,
        onClick: () => { onImport(); onClose(); }
      }, [
        React.createElement('span', { key: 'icon' }, '📂'),
        React.createElement('span', { key: 'text' }, 'Import Tree')
      ]),
      
      React.createElement('button', {
        key: 'desktop',
        style: secondaryButtonStyle,
        onClick: () => { onDesktop(); onClose(); }
      }, [
        React.createElement('span', { key: 'icon' }, '🖥️'),
        React.createElement('span', { key: 'text' }, 'Desktop Version')
      ]),
      
      React.createElement('button', {
        key: 'clear',
        style: dangerButtonStyle,
        onClick: () => { onClear(); onClose(); }
      }, [
        React.createElement('span', { key: 'icon' }, '🗑️'),
        React.createElement('span', { key: 'text' }, 'Clear All Data')
      ]),
      
      React.createElement('button', {
        key: 'cancel',
        style: cancelButtonStyle,
        onClick: onClose
      }, 'Cancel')
    ])
  );
};

// Main Mobile App Component
const MobileFamilyTreeApp = () => {
  const [familyTree, setFamilyTree] = useState({ people: [], relationships: [] });
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [mode, setMode] = useState('navigate'); // navigate, add, connect
  const [connectionType, setConnectionType] = useState('parent');
  const [connectionStart, setConnectionStart] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPosition, setAddPosition] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [version, setVersion] = useState({ version: '0.0.1', name: 'trvdition' });

  // Load data on mount
  useEffect(() => {
    const saved = loadFamilyTree();
    setFamilyTree(saved);
    
    // Load version info
    fetch('../version.json')
      .then(response => response.json())
      .then(data => setVersion(data))
      .catch(error => console.log('Could not load version:', error));
  }, []);

  // Auto-save changes
  useEffect(() => {
    saveFamilyTree(familyTree);
  }, [familyTree]);

  const addPerson = useCallback((personData) => {
    const newPerson = {
      id: Date.now().toString(),
      x: addPosition.x,
      y: addPosition.y,
      ...personData
    };
    
    setFamilyTree(prev => ({
      ...prev,
      people: [...prev.people, newPerson]
    }));
    setShowAddForm(false);
  }, [addPosition]);

  const updatePerson = useCallback((updatedPerson) => {
    setFamilyTree(prev => ({
      ...prev,
      people: prev.people.map(p => 
        p.id === updatedPerson.id ? updatedPerson : p
      )
    }));
  }, []);

  const deletePerson = useCallback((id) => {
    setFamilyTree(prev => ({
      people: prev.people.filter(p => p.id !== id),
      relationships: prev.relationships.filter(r => 
        r.from !== id && r.to !== id
      )
    }));
    setSelectedPersonId(null);
  }, []);

  const addRelationship = useCallback((fromId, toId, type) => {
    const newRelationship = {
      id: Date.now().toString(),
      type,
      from: fromId,
      to: toId
    };
    
    setFamilyTree(prev => ({
      ...prev,
      relationships: [...prev.relationships, newRelationship]
    }));
  }, []);

  const deleteRelationship = useCallback((id) => {
    setFamilyTree(prev => ({
      ...prev,
      relationships: prev.relationships.filter(r => r.id !== id)
    }));
  }, []);

  const handleCanvasTouch = useCallback((x, y) => {
    if (mode === 'add') {
      setAddPosition({ x: x - 60, y: y - 30 });
      setShowAddForm(true);
    } else if (connectionStart) {
      // Cancel connection
      setConnectionStart(null);
    }
  }, [mode, connectionStart]);

  const handlePersonSelect = useCallback((personId) => {
    if (mode === 'connect') {
      if (connectionStart && connectionStart.personId !== personId) {
        // Complete connection
        addRelationship(connectionStart.personId, personId, connectionType);
        setConnectionStart(null);
      } else if (!connectionStart) {
        // Start connection
        const person = familyTree.people.find(p => p.id === personId);
        setConnectionStart({
          personId,
          x: person.x + 60,
          y: person.y + 30
        });
      }
    }
    setSelectedPersonId(personId);
  }, [mode, connectionStart, connectionType, familyTree.people, addRelationship]);

  const handleConnectionStart = useCallback((personId, x, y) => {
    if (mode === 'connect') {
      setConnectionStart({ personId, x, y });
    }
  }, [mode]);

  const handleImport = async () => {
    try {
      const imported = await importFamilyTree();
      setFamilyTree(imported);
      setOffset({ x: 0, y: 0 });
      setScale(1);
    } catch (error) {
      alert('Failed to import file: ' + error.message);
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all data?')) {
      setFamilyTree({ people: [], relationships: [] });
      setOffset({ x: 0, y: 0 });
      setScale(1);
    }
  };

  const headerStyle = {
    background: '#007bff',
    color: 'white',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0
  };

  const versionStyle = {
    fontSize: '10px',
    opacity: 0.8,
    marginTop: '2px'
  };

  const toolbarStyle = {
    background: 'white',
    padding: '12px 16px',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  };

  const modeButtonsStyle = {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center'
  };

  const buttonStyle = {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    minHeight: '44px',
    flex: 1,
    maxWidth: '100px'
  };

  const getButtonStyle = (isActive) => ({
    ...buttonStyle,
    background: isActive ? '#007bff' : '#f8f9fa',
    color: isActive ? 'white' : '#495057',
    border: isActive ? 'none' : '1px solid #dee2e6'
  });

  const canvasStyle = {
    flex: 1,
    position: 'relative'
  };

  return React.createElement('div', {
    style: { 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif'
    }
  }, [
    // Header
    React.createElement('header', { key: 'header', style: headerStyle }, [
      React.createElement('div', { key: 'title' }, [
        React.createElement('h1', { style: titleStyle }, 'Family Tree'),
        React.createElement('div', { style: versionStyle }, `Mobile | ${version.name} v${version.version}`)
      ]),
      React.createElement('button', {
        key: 'menu',
        style: {
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '14px'
        },
        onClick: () => setShowMenu(true)
      }, '⋯')
    ]),

    // Toolbar
    React.createElement('div', { key: 'toolbar', style: toolbarStyle }, [
      React.createElement('div', { key: 'modes', style: modeButtonsStyle }, [
        React.createElement('button', {
          key: 'navigate',
          style: getButtonStyle(mode === 'navigate'),
          onClick: () => setMode('navigate')
        }, '🖱 Navigate'),
        
        React.createElement('button', {
          key: 'add',
          style: getButtonStyle(mode === 'add'),
          onClick: () => setMode('add')
        }, '👤 Add'),
        
        React.createElement('button', {
          key: 'connect',
          style: getButtonStyle(mode === 'connect'),
          onClick: () => setMode('connect')
        }, '🔗 Connect')
      ]),

      mode === 'connect' && React.createElement('div', {
        key: 'connection-controls',
        style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }
      }, [
        React.createElement('label', { key: 'label', style: { fontSize: '14px' } }, 'Type:'),
        React.createElement('select', {
          key: 'select',
          value: connectionType,
          onChange: (e) => setConnectionType(e.target.value),
          style: {
            padding: '8px 12px',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            fontSize: '14px'
          }
        }, [
          React.createElement('option', { key: 'parent', value: 'parent' }, 'Parent'),
          React.createElement('option', { key: 'spouse', value: 'spouse' }, 'Spouse'),
          React.createElement('option', { key: 'child', value: 'child' }, 'Child')
        ])
      ]),

      // Mode instructions
      React.createElement('div', {
        key: 'instruction',
        style: {
          textAlign: 'center',
          fontSize: '12px',
          color: '#6c757d',
          fontStyle: 'italic'
        }
      }, 
        mode === 'navigate' ? 'Drag people to move • Long press to edit' :
        mode === 'add' ? 'Tap anywhere to add a new person' :
        `Touch people to create ${connectionType} relationships`
      )
    ]),

    // Canvas
    React.createElement('div', { key: 'canvas', style: canvasStyle },
      React.createElement(MobileCanvas, {
        onCanvasTouch: handleCanvasTouch,
        scale,
        offset,
        onOffsetChange: setOffset,
        mode
      }, [
        // People
        ...familyTree.people.map(person =>
          React.createElement(MobilePersonNode, {
            key: person.id,
            person,
            onPersonUpdate: updatePerson,
            onPersonDelete: deletePerson,
            onPersonSelect: handlePersonSelect,
            onConnectionStart: handleConnectionStart,
            isSelected: selectedPersonId === person.id,
            isConnecting: connectionStart?.personId === person.id,
            connectionMode: mode === 'connect',
            scale
          })
        ),

        // Connection lines
        familyTree.relationships.length > 0 && React.createElement('svg', {
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'auto',
            overflow: 'visible',
            zIndex: 0
          }
        }, [
          React.createElement('defs', { key: 'defs' },
            React.createElement('marker', {
              id: 'arrowhead',
              markerWidth: '10',
              markerHeight: '7',
              refX: '10',
              refY: '3.5',
              orient: 'auto'
            }, React.createElement('polygon', {
              points: '0 0, 10 3.5, 0 7',
              fill: '#666'
            }))
          ),
          ...familyTree.relationships.map(relationship => {
            const fromPerson = familyTree.people.find(p => p.id === relationship.from);
            const toPerson = familyTree.people.find(p => p.id === relationship.to);
            
            if (!fromPerson || !toPerson) return null;
            
            const fromX = fromPerson.x + 60;
            const fromY = fromPerson.y + 30;
            const toX = toPerson.x + 60;
            const toY = toPerson.y + 30;
            
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2;
            
            const getLineColor = (type) => {
              switch (type) {
                case 'parent': return '#dc3545';
                case 'spouse': return '#28a745';
                case 'child': return '#007bff';
                default: return '#6c757d';
              }
            };
            
            const getTypeLabel = (type) => {
              switch (type) {
                case 'parent': return 'Parent';
                case 'spouse': return 'Spouse';
                case 'child': return 'Child';
                default: return type;
              }
            };
            
            return React.createElement('g', { key: relationship.id }, [
              // Connection line
              React.createElement('line', {
                key: 'line',
                x1: fromX,
                y1: fromY,
                x2: toX,
                y2: toY,
                stroke: getLineColor(relationship.type),
                strokeWidth: 3,
                markerEnd: 'url(#arrowhead)',
                style: { cursor: 'pointer' },
                onTouchStart: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                },
                onTouchEnd: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm(`Delete ${getTypeLabel(relationship.type).toLowerCase()} relationship?`)) {
                    deleteRelationship(relationship.id);
                  }
                }
              }),
              
              // Label background
              React.createElement('rect', {
                key: 'label-bg',
                x: midX - 25,
                y: midY - 10,
                width: 50,
                height: 20,
                fill: 'white',
                stroke: getLineColor(relationship.type),
                strokeWidth: 1,
                rx: 10,
                style: { cursor: 'pointer' },
                onTouchStart: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                },
                onTouchEnd: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm(`Delete ${getTypeLabel(relationship.type).toLowerCase()} relationship?`)) {
                    deleteRelationship(relationship.id);
                  }
                }
              }),
              
              // Label text
              React.createElement('text', {
                key: 'label-text',
                x: midX,
                y: midY + 4,
                textAnchor: 'middle',
                fontSize: '10',
                fontWeight: '500',
                fill: getLineColor(relationship.type),
                style: { 
                  cursor: 'pointer',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }
              }, getTypeLabel(relationship.type))
            ]);
          })
        ]),

        // Active connection line
        connectionStart && React.createElement('svg', {
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'visible',
            zIndex: 1
          }
        }, React.createElement('line', {
          x1: connectionStart.x,
          y1: connectionStart.y,
          x2: connectionStart.x + 50,
          y2: connectionStart.y + 50,
          stroke: '#007bff',
          strokeWidth: 3,
          strokeDasharray: '5,5',
          opacity: 0.8
        }))
      ])
    ),

    // Add Person Form
    showAddForm && React.createElement(AddPersonForm, {
      key: 'add-form',
      onSubmit: addPerson,
      onCancel: () => setShowAddForm(false)
    }),

    // Menu
    React.createElement(MobileMenu, {
      key: 'menu',
      isOpen: showMenu,
      onClose: () => setShowMenu(false),
      onExport: () => exportFamilyTree(familyTree),
      onImport: handleImport,
      onClear: handleClear,
      onDesktop: () => window.location.href = '../index.html?desktop=true'
    })
  ]);
};

// Add Person Form Component
const AddPersonForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    deathDate: '',
    gender: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSubmit(formData);
    }
  };

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  };

  const formStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '16px',
    marginBottom: '16px',
    fontFamily: 'inherit'
  };

  const buttonStyle = {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    marginRight: '8px',
    minHeight: '48px',
    flex: 1
  };

  return React.createElement('div', { style: overlayStyle }, 
    React.createElement('form', { style: formStyle, onSubmit: handleSubmit }, [
      React.createElement('h3', { 
        key: 'title',
        style: { margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }
      }, 'Add New Person'),
      
      React.createElement('input', {
        key: 'name',
        type: 'text',
        placeholder: 'Name (required)',
        value: formData.name,
        onChange: (e) => setFormData({...formData, name: e.target.value}),
        style: inputStyle
      }),
      
      React.createElement('input', {
        key: 'birth',
        type: 'date',
        placeholder: 'Birth Date',
        value: formData.birthDate,
        onChange: (e) => setFormData({...formData, birthDate: e.target.value}),
        style: inputStyle
      }),
      
      React.createElement('input', {
        key: 'death',
        type: 'date',
        placeholder: 'Death Date',
        value: formData.deathDate,
        onChange: (e) => setFormData({...formData, deathDate: e.target.value}),
        style: inputStyle
      }),
      
      React.createElement('select', {
        key: 'gender',
        value: formData.gender,
        onChange: (e) => setFormData({...formData, gender: e.target.value}),
        style: inputStyle
      }, [
        React.createElement('option', { key: 'none', value: '' }, 'Gender'),
        React.createElement('option', { key: 'male', value: 'male' }, 'Male'),
        React.createElement('option', { key: 'female', value: 'female' }, 'Female'),
        React.createElement('option', { key: 'other', value: 'other' }, 'Other')
      ]),
      
      React.createElement('div', {
        key: 'actions',
        style: { display: 'flex', gap: '8px', marginTop: '8px' }
      }, [
        React.createElement('button', {
          key: 'add',
          type: 'submit',
          style: { ...buttonStyle, background: '#007bff', color: 'white' }
        }, 'Add Person'),
        
        React.createElement('button', {
          key: 'cancel',
          type: 'button',
          onClick: onCancel,
          style: { ...buttonStyle, background: '#6c757d', color: 'white' }
        }, 'Cancel')
      ])
    ])
  );
};

// Initialize the app
const root = createRoot(document.getElementById('root'));
root.render(React.createElement(MobileFamilyTreeApp));