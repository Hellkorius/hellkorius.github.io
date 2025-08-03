import React, { useState, useCallback } from 'react';
import { Person, Relationship, FamilyTree } from './types';
import { PersonNode } from './PersonNode';
import { ConnectionLine } from './ConnectionLine';
import { InteractiveCanvas } from './InteractiveCanvas';
import { PersonForm } from './PersonForm';

interface FamilyTreeCanvasProps {
  familyTree: FamilyTree;
  onFamilyTreeUpdate: (tree: FamilyTree) => void;
  onResetViewReady?: (resetFn: () => void) => void;
}

type InteractionMode = 'navigate' | 'add-person' | 'connect';

export const FamilyTreeCanvas: React.FC<FamilyTreeCanvasProps> = ({
  familyTree,
  onFamilyTreeUpdate,
  onResetViewReady
}) => {
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('navigate');
  const [connectionType, setConnectionType] = useState<Relationship['type']>('parent');
  const [dragConnection, setDragConnection] = useState<{
    active: boolean;
    fromPersonId: string | null;
    startPos: { x: number; y: number };
    currentPos: { x: number; y: number };
  }>({
    active: false,
    fromPersonId: null,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 }
  });
  const [showPersonForm, setShowPersonForm] = useState<{ show: boolean; position: { x: number; y: number } }>({
    show: false,
    position: { x: 0, y: 0 }
  });

  const addPerson = useCallback((personData: Omit<Person, 'id'>) => {
    const newPerson: Person = {
      id: Date.now().toString(),
      ...personData
    };
    
    onFamilyTreeUpdate({
      ...familyTree,
      people: [...familyTree.people, newPerson]
    });
  }, [familyTree, onFamilyTreeUpdate]);

  const updatePerson = useCallback((updatedPerson: Person) => {
    onFamilyTreeUpdate({
      ...familyTree,
      people: familyTree.people.map(p => 
        p.id === updatedPerson.id ? updatedPerson : p
      )
    });
  }, [familyTree, onFamilyTreeUpdate]);

  const deletePerson = useCallback((id: string) => {
    onFamilyTreeUpdate({
      people: familyTree.people.filter(p => p.id !== id),
      relationships: familyTree.relationships.filter(r => 
        r.from !== id && r.to !== id
      )
    });
  }, [familyTree, onFamilyTreeUpdate]);

  const addRelationship = useCallback((fromId: string, toId: string, type: Relationship['type']) => {
    const newRelationship: Relationship = {
      id: Date.now().toString(),
      type,
      from: fromId,
      to: toId
    };
    
    onFamilyTreeUpdate({
      ...familyTree,
      relationships: [...familyTree.relationships, newRelationship]
    });
  }, [familyTree, onFamilyTreeUpdate]);

  const deleteRelationship = useCallback((id: string) => {
    onFamilyTreeUpdate({
      ...familyTree,
      relationships: familyTree.relationships.filter(r => r.id !== id)
    });
  }, [familyTree, onFamilyTreeUpdate]);

  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (interactionMode === 'add-person') {
      // Show form at clicked position (stay in add-person mode)
      setShowPersonForm({
        show: true,
        position: { x: x - 75, y: y - 50 } // center the person on click
      });
    } else if (dragConnection.active) {
      // Cancel drag connection
      setDragConnection({
        active: false,
        fromPersonId: null,
        startPos: { x: 0, y: 0 },
        currentPos: { x: 0, y: 0 }
      });
    }
  }, [interactionMode, dragConnection.active]);

  const handlePersonSelect = useCallback((personId: string) => {
    console.log('Person selected:', personId, 'dragConnection:', dragConnection);
    
    if (dragConnection.active && dragConnection.fromPersonId && dragConnection.fromPersonId !== personId) {
      // Complete connection
      console.log('Completing connection:', dragConnection.fromPersonId, '->', personId, 'type:', connectionType);
      addRelationship(dragConnection.fromPersonId, personId, connectionType);
      setDragConnection({
        active: false,
        fromPersonId: null,
        startPos: { x: 0, y: 0 },
        currentPos: { x: 0, y: 0 }
      });
      // Stay in connect mode for successive connections
    } else {
      setSelectedPerson(personId);
    }
  }, [dragConnection, addRelationship, connectionType]);


  const handleConnectionDrag = useCallback((personId: string, startPos: { x: number; y: number }, currentPos: { x: number; y: number }) => {
    setDragConnection({
      active: true,
      fromPersonId: personId,
      startPos,
      currentPos
    });
  }, []);

  const handleConnectionDragEnd = useCallback((e?: MouseEvent) => {
    console.log('Connection drag ending:', { active: dragConnection.active, fromPersonId: dragConnection.fromPersonId });
    
    if (dragConnection.active && e) {
      // Check if we're dropping on another person
      const targetElement = document.elementFromPoint(e.clientX, e.clientY);
      console.log('Target element at drop point:', targetElement);
      
      const personNode = targetElement?.closest('[data-person-id]') as HTMLElement;
      console.log('Found person node:', personNode);
      
      if (personNode && dragConnection.fromPersonId) {
        const targetPersonId = personNode.dataset.personId;
        console.log('Target person ID:', targetPersonId, 'From person ID:', dragConnection.fromPersonId);
        
        if (targetPersonId && targetPersonId !== dragConnection.fromPersonId) {
          console.log('Creating connection:', dragConnection.fromPersonId, '->', targetPersonId, 'type:', connectionType);
          // Complete the connection
          addRelationship(dragConnection.fromPersonId, targetPersonId, connectionType);
        }
      }
    }
    
    setDragConnection({
      active: false,
      fromPersonId: null,
      startPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 }
    });
  }, [dragConnection.active, dragConnection.fromPersonId, connectionType, addRelationship]);

  const handlePersonFormSubmit = useCallback((personData: Omit<Person, 'id'>) => {
    addPerson(personData);
    setShowPersonForm({ show: false, position: { x: 0, y: 0 } });
    // Stay in add-person mode for successive additions
  }, [addPerson]);

  const handlePersonFormCancel = useCallback(() => {
    setShowPersonForm({ show: false, position: { x: 0, y: 0 } });
    setInteractionMode('navigate');
  }, []);

  // Global mouseup and touchend handlers for connection drops
  React.useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (dragConnection.active) {
        handleConnectionDragEnd(e);
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (dragConnection.active && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        // Create a mouse-like event for compatibility
        const mouseEvent = new MouseEvent('mouseup', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        });
        handleConnectionDragEnd(mouseEvent);
      }
    };

    if (dragConnection.active) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchend', handleGlobalTouchEnd);
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [dragConnection.active, handleConnectionDragEnd]);

  return (
    <div className="family-tree-container">
      <div className="toolbar">
        <div className="mode-controls">
          <button 
            className={interactionMode === 'navigate' ? 'active' : ''}
            onClick={() => setInteractionMode('navigate')}
            title="Navigate Mode"
          >
            🖱️ Navigate
          </button>
          <button 
            className={interactionMode === 'add-person' ? 'active' : ''}
            onClick={() => setInteractionMode('add-person')}
            title="Add Person Mode"
          >
            👤 Add Person
          </button>
          <button 
            className={interactionMode === 'connect' ? 'active' : ''}
            onClick={() => setInteractionMode('connect')}
            title="Connect Mode"
          >
            🔗 Connect
          </button>
        </div>
        
        {interactionMode === 'connect' && (
          <div className="connection-controls">
            <label>Connection Type:</label>
            <select 
              value={connectionType} 
              onChange={(e) => setConnectionType(e.target.value as Relationship['type'])}
            >
              <option value="parent">Parent</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
            </select>
          </div>
        )}
      </div>
      
      <InteractiveCanvas 
        className={`canvas mode-${interactionMode}`}
        onCanvasClick={handleCanvasClick}
        disableCanvasClick={interactionMode === 'connect'}
        onResetViewReady={onResetViewReady}
      >
        {({ canvasRef, zoom, pan }) => (
          <>
            <svg className="connections-svg" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
                </marker>
              </defs>
              {familyTree.relationships.map(relationship => {
                const fromPerson = familyTree.people.find(p => p.id === relationship.from);
                const toPerson = familyTree.people.find(p => p.id === relationship.to);
                
                if (!fromPerson || !toPerson) return null;
                
                return (
                  <ConnectionLine
                    key={relationship.id}
                    relationship={relationship}
                    fromPerson={fromPerson}
                    toPerson={toPerson}
                    onDelete={deleteRelationship}
                  />
                );
              })}
              
              {dragConnection.active && (
                <line
                  x1={dragConnection.startPos.x}
                  y1={dragConnection.startPos.y}
                  x2={dragConnection.currentPos.x}
                  y2={dragConnection.currentPos.y}
                  stroke="#007bff"
                  strokeWidth={3}
                  strokeDasharray="5,5"
                  markerEnd="url(#arrowhead)"
                  className="drag-connection-line"
                />
              )}
            </svg>
            
            {familyTree.people.map(person => (
              <PersonNode
                key={person.id}
                person={person}
                onPersonUpdate={updatePerson}
                onPersonDelete={deletePerson}
                isSelected={selectedPerson === person.id}
                onSelect={() => handlePersonSelect(person.id)}
                interactionMode={interactionMode}
                connectionType={connectionType}
                onConnectionDrag={handleConnectionDrag}
                onConnectionDragEnd={handleConnectionDragEnd}
                canvasRef={canvasRef}
                zoom={zoom}
                pan={pan}
              />
            ))}
            
            {interactionMode === 'add-person' && (
              <div className="mode-instruction">
                Click anywhere to add a new person
              </div>
            )}
            
            {interactionMode === 'connect' && (
              <div className="mode-instruction">
                Drag from one person to another to create a {connectionType} relationship
              </div>
            )}
          </>
        )}
      </InteractiveCanvas>
      
      {showPersonForm.show && (
        <PersonForm
          position={showPersonForm.position}
          onSubmit={handlePersonFormSubmit}
          onCancel={handlePersonFormCancel}
        />
      )}
    </div>
  );
};