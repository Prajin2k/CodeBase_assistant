import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Home = () => {
  const [activeDemo, setActiveDemo] = useState('explain');
  const [pricingPeriod, setPricingPeriod] = useState('monthly'); // 'monthly' | 'yearly'
const [demoInput, setDemoInput] = useState('');
const [demoMessages, setDemoMessages] = useState([
  {
    sender: 'assistant',
    text: 'Welcome to CodePilot AI. Ask anything about your repository.',
  },
]);
  const demoScenarios = {
    explain: {
      input: 'Explain the index.js entry point in this repo.',
      output: `### 🤖 AI Explanation\n\nThe [index.js](file:///index.js) file serves as the main bootloader for the Express API. It initializes the following modules:\n\n1. **Environment Variables**: Loads configuration using \`dotenv.config()\`.\n2. **Database Link**: Triggers Mongoose connectivity via the \`connectDB()\` wrapper.\n3. **Router Mounts**: Hooks endpoints for user authentication, repository listings, and codebase chat operations under the \`/api\` context.\n\n\`\`\`javascript\nimport express from 'express';\nimport { connectDB } from './config/db.js';\n\nconst app = express();\nconnectDB();\n\`\`\`\n\nWould you like me to generate a Dockerfile to containerize this entrypoint?`,
    },
    refactor: {
      input: 'Optimise this database query loop.',
      output: `### 🏛️ Architect Feedback\n\nYour loop currently executes an individual query for every item (N+1 query problem). We can refactor it to run a single database call using \`$in\` in MongoDB:\n\n**Before:**\n\`\`\`javascript\nfor (let id of ids) {\n  let user = await User.findById(id);\n  users.push(user);\n}\n\`\`\`\n\n**After (Optimised):**\n\`\`\`javascript\n// Fetches all matching users in one round-trip\nconst users = await User.find({ _id: { $in: ids } });\n\`\`\`\n\n*Results:* Query overhead reduced by **~85%** on structures exceeding 10 items.`,
    },
    test: {
      input: 'Write a unit test for User.matchPassword.',
      output: `### 🧪 Test Generator\n\nHere is a complete Jest integration test case to validate hashed password matching:\n\n\`\`\`javascript\nimport User from '../models/User';\nimport bcrypt from 'bcryptjs';\n\ndescribe('User Password Matching', () => {\n  it('should return true when input matches hashed password', async () => {\n    const mockUser = new User({\n      username: 'tester',\n      password: 'password123'\n    });\n    // Pre-save hook hashes password\n    await mockUser.save();\n    \n    const isMatch = await mockUser.matchPassword('password123');\n    expect(isMatch).toBe(true);\n  });\n});\n\`\`\`\n\nThis provides 100% path coverage for the authentication logic.`,
    }
  };
const handleDemoSend = () => {
  if (!demoInput.trim()) return;

  const userMessage = {
    sender: 'user',
    text: demoInput,
  };

  setDemoMessages(prev => [...prev, userMessage]);

  setTimeout(() => {
    setDemoMessages(prev => [
      ...prev,
      {
        sender: 'assistant',
        text:
          'This repository uses a modular React architecture with reusable components and centralized styling.',
      },
    ]);
  }, 900);

  setDemoInput('');
};
  return (
    <div
  className="bg-dark-primary d-flex flex-column"
  style={{
    minHeight: '100dvh',
    overflowX: 'hidden',
  }}
>
      <Navbar />

      {/* Hero Section */}
      <section
        className="container text-center animate-fade-in"
        style={{
          paddingTop: 'clamp(5rem, 8vw, 7rem)',
paddingBottom: 'clamp(3rem, 6vw, 5rem)',
          position: 'relative',
        }}
      >
        <div
  style={{
    position: 'absolute',
    width: 'min(420px, 70vw)',
height: 'min(420px, 70vw)',
    background: 'rgba(99,102,241,0.10)',
    filter: 'blur(120px)',
    top: '-120px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 0,
  }}
></div>
        <span className="badge rounded-pill px-3 py-2 mb-3" style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: 'var(--color-primary)' }}>
          <i className="bi bi-stars me-1"></i> AI-Powered Code Intelligence Platform
        </span>
        <h1
  className="fw-extrabold text-white mb-3 lh-sm"
  style={{
    fontSize: 'clamp(2.4rem, 6vw, 4.8rem)',
    letterSpacing: '-0.03em',
  }}
> 
          Understand, Debug & Refactor <br />
          <span className="text-gradient-primary">Your Codebase with AI</span>
        </h1>
        <p className="lead text-secondary mx-auto mb-4" style={{ maxWidth: '720px', lineHeight: '1.8' }}>
  Upload repositories, analyze architecture, debug issues, generate tests, and interact with your entire codebase using a context-aware AI workspace powered by RAG.
</p>
        <div
  className="d-flex justify-content-center gap-3 mb-5 flex-wrap"
>
          <Link to="/register" className="btn btn-lg btn-primary-glow px-5 py-3 rounded-4">
            Get Started Free <i className="bi bi-arrow-right-short ms-1 fs-5"></i>
          </Link>
          <a href="#demo" className="btn btn-lg btn-secondary-outline px-5 py-3 rounded-4">
            See Live Demo
          </a>
        </div>
      </section>

      {/* Interactive Mock Workspace Demo Section */}
      <section id="demo" className="container my-5 pt-5 scroll-mt">
        <div className="text-center mb-5">
          <h2 className="text-white fw-bold">Interactive Showcase</h2>
          <p className="text-secondary">Simulate codebase actions and see how our Context Engine generates answers.</p>
        </div>

        <div className="row g-4 justify-content-center animate-slide-up">
          <div className="col-lg-10">
            <div className="glass-card glow-card-active p-0 overflow-hidden" style={{
            borderRadius: '24px',
            boxShadow: `
              0 25px 80px rgba(0,0,0,0.45),
              0 0 40px rgba(99,102,241,0.08)
              `,
          }}>
              {/* Fake Workspace Header */}
              <div className="d-flex align-items-center justify-content-between bg-dark-secondary px-3 py-2 border-bottom border-secondary-subtle" style={{ borderColor: 'var(--border-color)' }}>
                <div className="d-flex align-items-center gap-2">
                  <span className="bg-danger rounded-circle" style={{ width: '10px', height: '10px' }}></span>
                  <span className="bg-warning rounded-circle" style={{ width: '10px', height: '10px' }}></span>
                  <span className="bg-success rounded-circle" style={{ width: '10px', height: '10px' }}></span>
                  <span className="text-gradient-primary fw-bold ms-2 fs-6" style={{ fontFamily: 'var(--font-mono)' }}>CodePilot AI</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button 
                    onClick={() => {
  setActiveDemo('explain');

  setDemoMessages([
    {
      sender: 'user',
      text: demoScenarios.explain.input,
    },
    {
      sender: 'assistant',
      text: demoScenarios.explain.output,
    },
  ]);
}}
                    className={`btn btn-xs py-1 px-2 text-white border-0 ${activeDemo === 'explain' ? 'bg-dark-hover' : ''}`}
                    style={{ fontSize: '0.8rem', borderRadius: '4px' }}
                  >
                    📂 Explain Code
                  </button>
                  <button 
                    onClick={() => {
  setActiveDemo('refactor');

  setDemoMessages([
    {
      sender: 'user',
      text: demoScenarios.refactor.input,
    },
    {
      sender: 'assistant',
      text: demoScenarios.refactor.output,
    },
  ]);
}}
                    className={`btn btn-xs py-1 px-2 text-white border-0 ${activeDemo === 'refactor' ? 'bg-dark-hover' : ''}`}
                    style={{ fontSize: '0.8rem', borderRadius: '4px' }}
                  >
                    🏛️ Refactor query
                  </button>
                  <button 
                    onClick={() => {
  setActiveDemo('test');

  setDemoMessages([
    {
      sender: 'user',
      text: demoScenarios.test.input,
    },
    {
      sender: 'assistant',
      text: demoScenarios.test.output,
    },
  ]);
}}
                    className={`btn btn-xs py-1 px-2 text-white border-0 ${activeDemo === 'test' ? 'bg-dark-hover' : ''}`}
                    style={{ fontSize: '0.8rem', borderRadius: '4px' }}
                  >
                    🧪 Write Tests
                  </button>
                </div>
              </div>

              {/* Fake Workspace Layout */}
              <div
  className="row g-0"
  style={{
    minHeight: 'clamp(420px, 60vw, 600px)',
  }}
>
                {/* Left side: File List */}
                <div className="col-md-3 bg-dark-secondary border-end d-none d-md-block" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="p-3">
                    <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Files Explorer</span>
                    <ul className="list-unstyled mt-2 d-flex flex-column gap-1">
                      <li className="file-tree-item active"><i className="bi bi-filetype-js text-warning me-2"></i>index.js</li>
                      <li className="file-tree-item"><i className="bi bi-filetype-js text-warning me-2"></i>server.js</li>
                      <li className="file-tree-item"><i className="bi bi-folder-fill text-info me-2"></i>models/</li>
                      <li className="file-tree-item ms-3"><i className="bi bi-filetype-js text-warning me-2"></i>User.js</li>
                      <li className="file-tree-item"><i className="bi bi-filetype-json text-info me-2"></i>package.json</li>
                      <li className="file-tree-item"><i className="bi bi-markdown-fill text-primary me-2"></i>README.md</li>
                    </ul>
                  </div>
                </div>

                {/* Right side: Mock Chat Window */}
                <div className="col-md-9 bg-dark-primary d-flex flex-column justify-content-between p-4">
                {/* Messages */}
                  <div
                    className="d-flex flex-column gap-3 overflow-auto flex-grow-1"
                    style={{
  maxHeight: 'min(50vh, 420px)',
}}
                  >
                    {demoMessages.map((msg, index) => (
                      <div
                        key={index}
                        className={`chat-bubble ${
                          msg.sender === 'assistant'
                            ? 'chat-bubble-assistant align-self-start'
                            : 'chat-bubble-user align-self-end'
                        }`}
                        style={{
                          whiteSpace: 'pre-line',
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        {msg.text}
                      </div>
                    ))}
                  </div>

                  {/* Input Simulation Bar */}
                  <div className="d-flex gap-2 bg-dark-secondary p-2 border rounded border-secondary-subtle mt-3" style={{ borderColor: 'var(--border-color)' }}>
                    <input
                        type="text"
                        className="form-control form-control-custom"
                        placeholder="Ask about the repository..."
                        value={demoInput}
                        onChange={(e) => setDemoInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleDemoSend();
                          }
                        }}
                      />
                    <button
                      className="btn btn-primary-glow rounded-4"
                      onClick={handleDemoSend}
                    >
                      <i className="bi bi-send-fill"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="container my-5 py-5 border-top border-secondary-subtle" style={{ borderColor: 'var(--border-color) !important' }}>
        <div className="row g-4">
          <div className="col-md-4">
            <div className="glass-card feature-card-hover p-4 h-100">
              <div className="d-flex align-items-center justify-content-center bg-primary-glow rounded-3 mb-4" style={{ width: '48px', height: '48px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <i className="bi bi-folder2-open text-primary fs-4"></i>
              </div>
              <h4 className="text-white mb-2">Instant Import</h4>
              <p className="text-secondary mb-0">Upload local files using our folder scanner, or input a public GitHub URL to sync code nodes instantly into MongoDB.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="glass-card feature-card-hover p-4 h-100">
              <div className="d-flex align-items-center justify-content-center bg-secondary-glow rounded-3 mb-4" style={{ width: '48px', height: '48px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <i className="bi bi-chat-left-dots text-info fs-4"></i>
              </div>
              <h4 className="text-white mb-2">Context-Aware AI</h4>
              <p className="text-secondary mb-0">Chat natively about your code. Our backend reads files and provides structured refactoring, debugging, or test assertions based on your code.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="glass-card feature-card-hover p-4 h-100">
              <div className="d-flex align-items-center justify-content-center bg-accent-glow rounded-3 mb-4" style={{ width: '48px', height: '48px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <i className="bi bi-braces-asterisk text-purple fs-4" style={{ color: 'var(--color-accent)' }}></i>
              </div>
              <h4 className="text-white mb-2">Interactive Code Viewer</h4>
              <p className="text-secondary mb-0">Explore directories in a tree list. Open files into a code viewer featuring syntax coloring and click mapping.</p>
            </div>
          </div>
        </div>
      </section>

     {/* Tech Stack Section */}
<section className="container my-5 py-5 border-top border-secondary-subtle">
  <div className="text-center mb-5">
    <h2 className="text-white fw-bold">Built with Modern AI Infrastructure</h2>
    <p className="text-secondary">
      Powered by scalable technologies for intelligent repository analysis.
    </p>
  </div>

  <div className="row g-4 justify-content-center">
    {[
      'React',
      'Node.js',
      'MongoDB',
      'ChromaDB',
      'Groq LLM',
      'RAG Pipeline',
      'Bootstrap 5',
      'HuggingFace Embeddings'
    ].map((tech, index) => (
      <div key={index} className="col-6 col-md-3">
        <div className="glass-card text-center p-4 feature-card-hover">
          <h5 className="text-white mb-0">{tech}</h5>
        </div>
      </div>
    ))}
  </div>
</section>

      {/* Footer */}
      <footer className="container mt-5 pt-5 border-top border-secondary-subtle text-center text-secondary" style={{ borderColor: 'var(--border-color) !important', fontSize: '0.85rem' }}>
        <p className="mb-0">
  Built for developers who want AI-native code intelligence.
</p>
      </footer>
    </div>
  );
};

export default Home;
