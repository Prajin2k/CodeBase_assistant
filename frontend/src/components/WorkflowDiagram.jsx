import React from 'react';

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider
} from 'reactflow';

import 'reactflow/dist/style.css';

const WorkflowDiagram = ({
  nodes,
  edges
}) => {

  console.log("NODES:", nodes);
  console.log("EDGES:", edges);

  return (

    <div
  style={{
    width: '100%',
    height: '600px',
    background: '#0f172a',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
    position: 'relative'
  }}
>

      <ReactFlowProvider>

       <ReactFlow
  nodes={nodes || []}
  edges={edges || []}
  fitView
  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
  minZoom={0.2}
  maxZoom={2}
  style={{
    width: '100%',
    height: '100%'
  }}
  proOptions={{ hideAttribution: true }}
>

          <Background gap={20} size={1}/>
          <Controls />
          <MiniMap />

        </ReactFlow>

      </ReactFlowProvider>

    </div>
  );
};

export default WorkflowDiagram;