export const generateWorkflow = (files) => {

  const nodes = [];
  const edges = [];

  const groups = {
    frontend: [],
    backend: [],
    database: [],
    ai: [],
    config: []
  };

  // Categorize files
  files.forEach((file) => {

    const path = file.path.toLowerCase();

    if (
      path.includes('components') ||
      path.includes('pages') ||
      path.includes('frontend')
    ) {
      groups.frontend.push(file);
    }

    else if (
      path.includes('routes') ||
      path.includes('controllers') ||
      path.includes('middleware') ||
      path.includes('backend')
    ) {
      groups.backend.push(file);
    }

    else if (
      path.includes('models') ||
      path.includes('schema') ||
      path.includes('mongodb')
    ) {
      groups.database.push(file);
    }

    else if (
      path.includes('ai') ||
      path.includes('rag') ||
      path.includes('chat')
    ) {
      groups.ai.push(file);
    }

    else {
      groups.config.push(file);
    }

  });

  // MAIN ARCHITECTURE NODES

  const architectureNodes = [
    {
      id: 'frontend',
      position: { x: 100, y: 100 },
      data: {
        label: `🎨 Frontend (${groups.frontend.length})`
      },
      style: {
        background: '#2563eb',
        color: 'white',
        border: 'none',
        padding: 10,
        borderRadius: 12,
        width: 220
      }
    },

    {
      id: 'backend',
      position: { x: 450, y: 100 },
      data: {
        label: `⚙️ Backend (${groups.backend.length})`
      },
      style: {
        background: '#059669',
        color: 'white',
        border: 'none',
        padding: 10,
        borderRadius: 12,
        width: 220
      }
    },

    {
      id: 'database',
      position: { x: 800, y: 100 },
      data: {
        label: `🗄️ Database (${groups.database.length})`
      },
      style: {
        background: '#7c3aed',
        color: 'white',
        border: 'none',
        padding: 10,
        borderRadius: 12,
        width: 220
      }
    },

    {
      id: 'ai',
      position: { x: 450, y: 320 },
      data: {
        label: `🤖 AI / RAG Engine (${groups.ai.length})`
      },
      style: {
        background: '#ea580c',
        color: 'white',
        border: 'none',
        padding: 10,
        borderRadius: 12,
        width: 260
      }
    }
  ];

  nodes.push(...architectureNodes);

  // MAIN CONNECTIONS

  edges.push(
    {
      id: 'frontend-backend',
      source: 'frontend',
      target: 'backend',
      animated: true,
      label: 'API Calls'
    },

    {
      id: 'backend-database',
      source: 'backend',
      target: 'database',
      animated: true,
      label: 'MongoDB'
    },

    {
      id: 'backend-ai',
      source: 'backend',
      target: 'ai',
      animated: true,
      label: 'AI Processing'
    }
  );

  // SAMPLE FILE NODES

  let yOffset = 520;

  files.slice(0, 12).forEach((file, index) => {

    const fileNodeId = `file-${index}`;

    nodes.push({
      id: fileNodeId,

      position: {
        x: (index % 4) * 260,
        y: yOffset + Math.floor(index / 4) * 120
      },

      data: {
        label: file.name
      },

      style: {
        background: '#111827',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: 8,
        width: 200
      }
    });

    // Connect sample files to parent groups

    let sourceGroup = 'backend';

    const path = file.path.toLowerCase();

    if (
      path.includes('components') ||
      path.includes('pages')
    ) {
      sourceGroup = 'frontend';
    }

    else if (
      path.includes('models')
    ) {
      sourceGroup = 'database';
    }

    else if (
      path.includes('ai') ||
      path.includes('rag')
    ) {
      sourceGroup = 'ai';
    }

    edges.push({
      id: `${sourceGroup}-${fileNodeId}`,
      source: sourceGroup,
      target: fileNodeId,
      animated: false
    });

  });

  return {
    nodes,
    edges
  };
};