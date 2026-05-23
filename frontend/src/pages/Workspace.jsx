import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Editor from '@monaco-editor/react';
// Custom syntax highlighting languages support for Prism
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import WorkflowDiagram from '../components/WorkflowDiagram';

const Workspace = () => {
  const [workflowData, setWorkflowData] =
    useState(null);
  const [showWorkflow, setShowWorkflow] =
    useState(false);
  const { repoId } = useParams();
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  // State
  const [repository, setRepository] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Layout States
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // File explorer states
  const [expandedFolders, setExpandedFolders] = useState({});
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [codeSearchQuery, setCodeSearchQuery] = useState('');
  const [openTabs, setOpenTabs] = useState([]); // Array of file objects
  const [activeFile, setActiveFile] = useState(null); // File object currently open

  // Chat states
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [agentMode, setAgentMode] = useState('developer'); // 'developer' | 'architect' | 'debugger' | 'generator'
  const [chatLoading, setChatLoading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);
  // Load Repository & Chat Details
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        // Fetch Repo
        const repoRes = await fetch(`/api/repositories/${repoId}`, {
          headers: getAuthHeaders(),
        });
        if (repoRes.status === 404) {
  navigate('/dashboard');
  return;
}

if (!repoRes.ok) {
  throw new Error('Failed to load codebase. Check access permissions.');
}
        const repoData = await repoRes.json();

setRepository(repoData);
       const workflowRes = await fetch(
  `/api/repositories/${repoId}/workflow`,
  {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    }
  }
);

if (workflowRes.ok) {
  const workflow = await workflowRes.json();

  console.log('Workflow Loaded:', workflow);

  setWorkflowData(workflow);
}
        // Auto-open README.md or first file if available
        if (repoData.files && repoData.files.length > 0) {
          const readmeFile = repoData.files.find(f => f.name.toLowerCase() === 'readme.md');
          const defaultFile = readmeFile || repoData.files[0];
          setOpenTabs([defaultFile]);
          setActiveFile(defaultFile);
        }

        // Fetch Chat History
        const chatRes = await fetch(`/api/chat/${repoId}`, {
          headers: getAuthHeaders(),
        });
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          setMessages(chatData.messages || []);
        }
      } catch (err) {
        setError(err.message || 'Error configuring workspace.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceData();
  }, [repoId]);

  // Trigger Prism highlighting whenever active file changes
  useEffect(() => {
    if (activeFile) {
      Prism.highlightAll();
    }
  }, [activeFile]);

  // Auto Scroll Chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);
useEffect(() => {
  window.workspaceSelectFile = (path) => {
    if (repository && repository.files) {
      const matchedFile = repository.files.find(
        f => f.path === path
      );

      if (matchedFile) {
        handleOpenFile(matchedFile);
      }
    }
  };

  return () => {
    window.workspaceSelectFile = null;
  };
}, [repository]);
  // Expand folders helper on load
  useEffect(() => {
    if (repository && repository.files) {
      // Auto expand root level folders
      const initialExpands = {};
      repository.files.forEach(file => {
        const parts = file.path.split('/');
        if (parts.length > 1) {
          initialExpands[parts[0]] = true;
        }
      });
      setExpandedFolders(initialExpands);
    }
  }, [repository]);
useEffect(() => {
  if (!editorRef.current) return;

  const editor = editorRef.current;
  const model = editor.getModel();

  if (!model || !codeSearchQuery) {
    decorationsRef.current =
      editor.deltaDecorations(
        decorationsRef.current,
        []
      );

    return;
  }

  const matches = model.findMatches(
    codeSearchQuery,
    true,
    false,
    false,
    null,
    true
  );

  const newDecorations = matches.map(
    (match) => ({
      range: match.range,
      options: {
        inlineClassName: 'searchHighlight',
      },
    })
  );

  decorationsRef.current =
    editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );

}, [codeSearchQuery]);
  // Submit User Message with SSE Streaming
  const handleSendMessage = async (e, textOverride = '') => {
    if (e) e.preventDefault();
    const queryText = textOverride || inputMessage;
    if (!queryText.trim() || chatLoading) return;

    setInputMessage('');
    setChatLoading(true);

    // Add user message locally first for instant reaction
    setMessages(prev => [...prev, { sender: 'user', text: queryText, createdAt: new Date() }]);

    try {
      const response = await fetch(`/api/chat/${repoId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: queryText,
          agentMode: agentMode,
          activeFile
        }),
      });

     if (!response.ok) {
  throw new Error('Failed to analyze request');
}

      // Add a placeholder message for the assistant that we will stream into
      if (
  !queryText.toLowerCase().includes('workflow') &&
  !queryText.toLowerCase().includes('architecture') &&
  !queryText.toLowerCase().includes('diagram')
) {

  setMessages(prev => [
    ...prev,
    {
      sender: 'assistant',
      text: '',
      createdAt: new Date()
    }
  ]);
}

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const rawText = decoder.decode(value);
        console.log('RAW SSE:', rawText);
        // Split by SSE double-newline boundaries
        const lines = rawText.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
  const parsed = JSON.parse(dataStr);
if (parsed.workflow) {

  console.log(
    'Workflow received:',
    parsed.workflow
  );

  setWorkflowData(parsed.workflow);
setShowWorkflow(true);
  continue;
}
  if (parsed.chunk) {
    assistantText += parsed.chunk;

    // Update assistant message
    setMessages(prev => {
      const updated = [...prev];

      if (
        updated.length > 0 &&
        updated[updated.length - 1].sender === 'assistant'
      ) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: assistantText,
        };
      }

      return updated;
    });
  }

} catch (err) {
  // Ignore malformed SSE chunks
}
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { sender: 'assistant', text: `⚠️ **Error:** ${err.message || 'Connection lost. Verify server state.'}`, createdAt: new Date() }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Open file helper
  const handleOpenFile = (file) => {
    if (!openTabs.find(t => t._id === file._id)) {
      setOpenTabs([...openTabs, file]);
    }
    setActiveFile(file);
  };

  // Close file tab helper
  const handleCloseTab = (fileId, e) => {
    e.stopPropagation();
    const updatedTabs = openTabs.filter(t => t._id !== fileId);
    setOpenTabs(updatedTabs);
    if (activeFile && activeFile._id === fileId) {
      setActiveFile(updatedTabs.length > 0 ? updatedTabs[updatedTabs.length - 1] : null);
    }
  };

  // Build File Tree Object dynamically
  const buildFileTree = (files) => {
    const root = { name: 'root', isFolder: true, children: {} };

    files.forEach(file => {
      // Filter file explorer files by search query
      if (fileSearchQuery && !file.path.toLowerCase().includes(fileSearchQuery.toLowerCase())) {
        return;
      }

      const parts = file.path.split('/');
      let current = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        if (isLast) {
          current.children[part] = {
            name: part,
            isFolder: false,
            fileData: file,
          };
        } else {
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              isFolder: true,
              children: {},
            };
          }
          current = current.children[part];
        }
      });
    });

    return root;
  };

  // Render File Tree Node
  const renderFileTreeNode = (node, path = '') => {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    const isFolderExpanded = expandedFolders[currentPath];

    const toggleFolder = () => {
      setExpandedFolders({
        ...expandedFolders,
        [currentPath]: !isFolderExpanded,
      });
    };

    if (node.isFolder) {
      return (
        <div key={currentPath} className="ms-2">
          <div 
            onClick={toggleFolder} 
            className="file-tree-item fw-semibold d-flex align-items-center"
            style={{ color: '#d1d5db' }}
          >
            <i className={`bi ${isFolderExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} me-1`} style={{ fontSize: '0.75rem' }}></i>
            <i className={`bi ${isFolderExpanded ? 'bi-folder2-open' : 'bi-folder'} text-info me-2`}></i>
            {node.name}
          </div>
          {isFolderExpanded && (
            <div className="border-start ms-2 ps-1" style={{ borderColor: 'rgba(255,255,255,0.05) !important' }}>
              {Object.values(node.children)
                .sort((a, b) => (b.isFolder ? 1 : 0) - (a.isFolder ? 1 : 0) || a.name.localeCompare(b.name))
                .map(child => renderFileTreeNode(child, currentPath))}
            </div>
          )}
        </div>
      );
    } else {
      const isSelected = activeFile && activeFile._id === node.fileData._id;
      
      // Get appropriate icon based on file type
      const getFileIcon = (lang) => {
        switch (lang) {
          case 'javascript':
          case 'typescript':
            return <i className="bi bi-filetype-js text-warning me-2"></i>;
          case 'python':
            return <i className="bi bi-filetype-py text-success me-2"></i>;
          case 'html':
            return <i className="bi bi-filetype-html text-danger me-2"></i>;
          case 'css':
            return <i className="bi bi-filetype-css text-info me-2"></i>;
          case 'json':
            return <i className="bi bi-filetype-json text-info me-2"></i>;
          case 'markdown':
            return <i className="bi bi-markdown-fill text-primary me-2"></i>;
          default:
            return <i className="bi bi-file-earmark-code text-secondary me-2"></i>;
        }
      };

      return (
        <div 
          key={node.fileData._id}
          onClick={() => handleOpenFile(node.fileData)}
          className={`file-tree-item ms-3 ${isSelected ? 'active' : ''}`}
        >
          {getFileIcon(node.fileData.language)}
          <span className="text-truncate">{node.name}</span>
        </div>
      );
    }
  };

  // Copy code to clipboard helper
  const copyToClipboard = () => {
    if (activeFile && activeFile.content) {
      navigator.clipboard.writeText(activeFile.content);
      alert('Code copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-dark-primary text-white">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3 text-secondary">Initializing Codebase Sandbox...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5 py-5 text-center bg-dark-primary text-white">
        <div className="alert alert-danger py-4 border-0 bg-danger bg-opacity-10 text-danger rounded">
          <i className="bi bi-exclamation-octagon display-5 d-block mb-3"></i>
          <h4>Workspace Error</h4>
          <p>{error}</p>
          <Link to="/dashboard" className="btn btn-secondary-outline mt-3">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const fileTreeRoot = repository ? buildFileTree(repository.files) : { children: {} };

  return (
   <div
  className="bg-dark-primary d-flex flex-column"
  style={{
    height: '100dvh',
    overflow: 'hidden',
    paddingTop: '72px',
  }}
>
      
      {/* Workspace Subheader */}
      <header className="glass-panel border-bottom py-2 px-3 d-flex align-items-center justify-content-between" style={{
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: '72px',
  zIndex: 9999,

  backdropFilter: 'blur(14px)',

  background: '#020817',

  borderBottom:
    '1px solid rgba(255,255,255,0.08)',
}}>
        <div className="d-flex align-items-center gap-3">
          <Link to="/dashboard" className="btn btn-sm btn-secondary-outline px-2 py-1.5" title="Exit to dashboard">
            <i className="bi bi-chevron-left"></i>
          </Link>
          <div>
            <h5 className="text-white fw-semibold mb-0 text-truncate" style={{ maxWidth: '250px' }}>{repository.name}</h5>
            <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-git me-1"></i> {repository.source === 'github' ? 'main' : 'local-workspace'}
            </span>
          </div>
        </div>

        {/* Collapsible toggle status buttons */}
        <div className="d-flex align-items-center gap-2">
          <button 
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className={`btn btn-sm ${leftPanelCollapsed ? 'btn-secondary-outline' : 'btn-dark'} border-0`}
            title="Toggle File Explorer (Ctrl+B)"
          >
            <i className="bi bi-layout-sidebar"></i>
          </button>
          <button 
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className={`btn btn-sm ${rightPanelCollapsed ? 'btn-secondary-outline' : 'btn-dark'} border-0`}
            title="Toggle Code Editor"
          >
            <i className="bi bi-layout-sidebar-reverse"></i>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
    <div
 className="d-flex flex-grow-1"
 style={{
   overflow: 'hidden',
   minHeight: 0,
   minWidth: 0,
 }}
>
        
        {/* LEFT PANEL: File Explorer */}
        {!leftPanelCollapsed && (
          <div className="sidebar-panel d-flex flex-column animate-fade-in" style={{
  flex: '0 0 18%',
  minWidth: '220px',
  maxWidth: '320px',
  overflow: 'hidden',
  minHeight: 0,
  background: 'rgba(10,15,25,0.92)',
}}>
            <div className="p-3 border-bottom border-secondary-subtle" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-muted uppercase fw-bold small text-gradient-primary">Workspace Tree</span>
              <div className="input-group input-group-sm mt-2 border rounded border-secondary-subtle" style={{ borderColor: 'var(--border-color)' }}>
                <span className="input-group-text bg-transparent text-muted border-0"><i
  className="bi bi-search"
  style={{ color: 'rgba(255,255,255,0.55)' }}
></i></span>
                <input
                  type="text"
                  className="form-control bg-transparent text-white border-0 py-1.5 shadow-none"
                  placeholder="Filter codebase..."
                  value={fileSearchQuery}
                  onChange={(e) => setFileSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* File List Tree */}
            <div
  className="flex-grow-1 overflow-auto p-2"
  style={{
    minHeight: 0,
  }}
>
              {Object.keys(fileTreeRoot.children).length === 0 ? (
                <div className="text-center p-3 text-muted small mt-4">
                  No matching files found.
                </div>
              ) : (
                Object.values(fileTreeRoot.children)
                  .sort((a, b) => (b.isFolder ? 1 : 0) - (a.isFolder ? 1 : 0) || a.name.localeCompare(b.name))
                  .map(node => renderFileTreeNode(node))
              )}
            </div>
          </div>
        )}

        {/* CENTER PANEL: AI Chat Interface */}
        <div
  className="d-flex flex-column flex-grow-1 bg-dark-primary border-end border-start"
  style={{
    borderColor: 'var(--border-color)',
    minWidth: 0,
  }}
>
          {/* Agent Mode / Activity Selector */}
          <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-dark-secondary border-bottom" style={{ borderColor: 'var(--border-color)' }}>
            <div className="d-flex align-items-center gap-2">
              <span className="position-relative d-flex" style={{ width: '10px', height: '10px' }}>
                <span className="animate-ping position-absolute inline-flex h-100 w-100 rounded-circle bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-circle h-3 w-3 bg-success" style={{ width: '10px', height: '10px' }}></span>
              </span>
              <span className="text-secondary small fw-medium">AI Agent Mode:</span>
            </div>
            
            <div className="btn-group" role="group">
              <button 
                type="button" 
                className={`btn btn-xs py-1 px-2.5 small border-0 text-white ${agentMode === 'developer' ? 'bg-primary-glow' : 'bg-dark-hover'}`}
                style={{ fontSize: '0.85rem', borderRadius: '4px',fontWeight: 500 }}
                onClick={() => setAgentMode('developer')}
              >
                🤖 Dev
              </button>
              <button 
                type="button" 
                className={`btn btn-xs py-1 px-2.5 small border-0 text-white ${agentMode === 'architect' ? 'bg-primary-glow' : 'bg-dark-hover'}`}
                style={{ fontSize: '0.85rem', borderRadius: '4px',fontWeight: 500 }}
                onClick={() => setAgentMode('architect')}
              >
                🏛️ Architect
              </button>
              <button 
                type="button" 
                className={`btn btn-xs py-1 px-2.5 small border-0 text-white ${agentMode === 'debugger' ? 'bg-primary-glow' : 'bg-dark-hover'}`}
                style={{ fontSize: '0.85rem', borderRadius: '4px',fontWeight: 500 }}
                onClick={() => setAgentMode('debugger')}
              >
                🐛 Debug
              </button>
            </div>
          </div>

          {/* Messages Scroller */}
         <div
  className="flex-grow-1 overflow-auto p-4 d-flex flex-column gap-3"
  style={{
    minHeight: 0,
    minWidth: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
  }}
>
            {messages.length === 0 ? (
              <div className="text-center my-auto px-4 py-5">
                <i className="bi bi-stars text-gradient-primary display-4 mb-3 d-block"></i>
                <h4 className="text-white">Workspace AI Assistant</h4>
                <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '400px' }}>
                  Ask questions, search for keywords, request unit test configurations, or refactor functions.
                </p>
                <div className="d-flex flex-wrap justify-content-center gap-2">
                  <button onClick={() => handleSendMessage(null, 'Show directory structure')} className="btn btn-sm btn-secondary-outline py-2 px-3">
                    📂 Explain structure
                  </button>
                  <button onClick={() => handleSendMessage(null, 'Help me search user profiles')} className="btn btn-sm btn-secondary-outline py-2 px-3">
                    🔍 Search codebase
                  </button>
                  <button onClick={() => handleSendMessage(null, `Analyze ${repository.files[0]?.name || 'App.jsx'}`)} className="btn btn-sm btn-secondary-outline py-2 px-3" disabled={!repository.files[0]}>
                    📄 Explain primary module
                  </button>
                </div>
              </div>
            ) : (
                <>
                  {messages.map((msg, index) => {
                    const isAssistant = msg.sender === 'assistant';

                    return (
                      <div
                        key={index}
                        className={`chat-bubble ${isAssistant ? 'chat-bubble-assistant text-start' : 'chat-bubble-user align-self-end text-end'}`}
                      >
                        {isAssistant ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.text}
                          </ReactMarkdown>
                        ) : (
                          msg.text
                        )}
                      </div>
                    );
                  })}</>
            )}

           

            {/* Thinking / typing spinner */}
            {chatLoading && (
              <div className="chat-bubble chat-bubble-assistant align-self-start text-start d-flex align-items-center gap-2 py-2">
                <span className="spinner-grow spinner-grow-sm text-primary" role="status"></span>
                <span className="text-secondary small">Agent is scanning file tree...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form message input */}
          <form onSubmit={handleSendMessage} className="p-3 border-top bg-dark-secondary" style={{ borderColor: 'var(--border-color)' }}>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-custom bg-dark-primary shadow-none py-3 fs-6 rounded-4"
                placeholder={`Ask ${agentMode} agent a question... (e.g. "What does this repo do?")`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                className="btn btn-primary-glow px-4 rounded-4"
                disabled={chatLoading || !inputMessage.trim()}
              >
                <i className="bi bi-send-fill"></i>
              </button>
            </div>
          </form>
        </div>
{showWorkflow && workflowData && (
  <div
    style={{
      position: 'fixed',
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '92%',
      height: '82vh',
      background: '#0b1120',
      zIndex: 9999,
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      overflow: 'hidden'
    }}
  >

    <div
      className="d-flex justify-content-between align-items-center px-4 py-3"
      style={{
        borderBottom:
          '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <h5 className="text-white mb-0">
        🏗️ Repository Workflow Architecture
      </h5>

      <button
        className="btn btn-sm btn-danger"
        onClick={() =>
          setShowWorkflow(false)
        }
      >
        Close
      </button>
    </div>

    <div
      style={{
        width: '100%',
        height: 'calc(82vh - 70px)'
      }}
    >
      <WorkflowDiagram
        nodes={workflowData.nodes}
        edges={workflowData.edges}
      />
    </div>

  </div>
)}
        {/* RIGHT PANEL: Code Preview Panel */}
        {!rightPanelCollapsed && (
          <div className="d-flex flex-column bg-dark-secondary animate-fade-in"style={{
  flex: '0 0 42%',
  minWidth: 0,
  maxWidth: '55%',
  overflow: 'hidden',
}}>
            
            {/* Editor Tabs bar */}
            <div className="d-flex align-items-center bg-dark-primary border-bottom overflow-x-auto" style={{ height: '40px', whiteSpace: 'nowrap', borderColor: 'var(--border-color)' }}>
              {openTabs.map((tab) => {
                const isActive = activeFile && activeFile._id === tab._id;
                return (
                  <div 
                    key={tab._id}
                    onClick={() => setActiveFile(tab)}
                    className={`editor-tab px-3 d-flex align-items-center gap-2 ${isActive ? 'active' : ''}`}
                    style={{ height: '40px' }}
                  >
                    <i className="bi bi-file-code text-gradient-primary"></i>
                    <span className="text-truncate" style={{ maxWidth: '120px' }}>{tab.name}</span>
                    <button 
                      onClick={(e) => handleCloseTab(tab._id, e)}
                      className="btn btn-xs text-secondary border-0 p-0 hover-text-white"
                      style={{ background: 'transparent', fontSize: '0.75rem' }}
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                );
              })}
              {openTabs.length === 0 && (
                <span className="text-muted small ms-3">No active editor files</span>
              )}
            </div>

            {/* Code Content Area */}
            <div className="flex-grow-1 bg-dark-primary position-relative overflow-hidden">
              {activeFile ? (
                <div className="h-100 d-flex flex-column justify-content-between">
                  {/* File Metadata Info */}
                  <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-dark-secondary border-bottom" style={{ borderColor: 'var(--border-color)', height: '40px' }}>
                    <span className="text-secondary small font-monospace">
                      {activeFile.path}
                    </span>
                    <div className="d-flex align-items-center gap-2">

  <div
    className="d-flex align-items-center px-2 rounded-3"
    style={{
      background: 'rgba(255,255,255,0.06)',
      height: '30px',
      width: '180px',
    }}
  >
    <i
      className="bi bi-search me-2"
      style={{
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.8rem',
      }}
    ></i>

    <input
      type="text"
      placeholder="Search code..."
      value={codeSearchQuery}
      onChange={(e) =>
        setCodeSearchQuery(e.target.value)
      }
      className="bg-transparent border-0 text-white w-100"
      style={{
        outline: 'none',
        fontSize: '0.8rem',
      }}
    />
  </div>

  <button 
    onClick={copyToClipboard}
    className="btn btn-xs btn-secondary-outline py-1 px-2 d-flex align-items-center gap-1"
    style={{ fontSize: '0.75rem' }}
  >
    <i className="bi bi-clipboard"></i> Copy
  </button>

</div>
                  </div>

                  {/* Pre/Code Scroll View */}
                  <div
  className="flex-grow-1 overflow-auto code-area p-0"
  style={{
    minWidth: 0,
  }}
>
                    <Editor
                      beforeMount={(monaco) => {
  monaco.editor.defineTheme('codepilot-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {},
  });
}}
                      onMount={(editor) => {
  editorRef.current = editor;
}}
  height="100%"
  language={activeFile.language || 'javascript'}
  value={activeFile.content || '// Empty file'}
                      theme="vs-dark"
                      
  options={{
    minimap: { enabled: true },
    fontSize: 14,
    fontFamily: 'JetBrains Mono',
    smoothScrolling: true,
    scrollBeyondLastLine: false,
    readOnly: true,
    automaticLayout: true,
    wordWrap: 'on',
    find: {
      addExtraSpaceOnTop: false,
    },
      padding: {
  top: 16,
      },
  }}
/>
                  </div>
                </div>
              ) : (
                <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-4">
                  <i className="bi bi-file-earmark-code text-muted display-3 mb-3 d-block"></i>
                  <h5 className="text-white">Workspace Code Viewer</h5>
                  <p className="text-secondary small mx-auto" style={{ maxWidth: '300px' }}>
                    Select a file in the left File Explorer tree to inspect its contents and syntax.
                  </p>
                </div>
              )}
            </div>
            
            
          </div>
        )}
      </div>
    </div>
  );
};

export default Workspace;
