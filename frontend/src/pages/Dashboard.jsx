import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  
  // Modal / Import states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('github'); // 'github' | 'upload'
  const [repoName, setRepoName] = useState('');
  const [repoDesc, setRepoDesc] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [zipFile, setZipFile] = useState(null);

  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  // Load Repositories
  const fetchRepositories = async () => {
    try {
      const res = await fetch('/api/repositories', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRepositories(data);
      } else {
        setError('Failed to fetch repositories');
      }
    } catch (err) {
      setError('Connection error: could not fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  // Handle GitHub Import
  const handleGithubImport = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!repoName || !githubUrl) {
      setError('Repository name and GitHub URL are required');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/repositories/import-github', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: repoName,
          description: repoDesc,
          githubUrl: githubUrl,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Success
        setShowModal(false);
        resetForm();
        fetchRepositories();
        // Redirect directly to workspace
        navigate(`/workspace/${data._id}`);
      } else {
        setError(data.message || 'Failed to import repository from GitHub');
      }
    } catch (err) {
      setError('Failed to reach server. Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Folder selection & text file parsing
  const handleFolderSelection = (e) => {
    const filesList = Array.from(e.target.files);
    
    // Filter out common binary types and node_modules/lock files to save bandwidth
    const filteredFiles = filesList.filter(file => {
      const path = file.webkitRelativePath || file.name;
      return (
        !path.includes('node_modules/') &&
        !path.includes('.git/') &&
        !path.includes('package-lock.json') &&
        !path.includes('yarn.lock') &&
        !path.includes('pnpm-lock.yaml') &&
        !/\.(png|jpe?g|gif|ico|svg|woff2?|eot|ttf|otf|mp4|zip|gz|pdf)$/i.test(file.name)
      );
    });

    if (filteredFiles.length === 0) {
      alert('No compatible text/code files found in selected folder.');
      return;
    }

    setSelectedFiles(filteredFiles);
    // Suggest repo name based on directory name
    const pathParts = filteredFiles[0].webkitRelativePath.split('/');
    if (pathParts.length > 0 && !repoName) {
      setRepoName(pathParts[0]);
    }
  };

  // Upload Local Files
  const handleLocalUpload = async (e) => {
    e.preventDefault();
    setError('');

    if (!repoName || selectedFiles.length === 0) {
      setError('Please select a folder and enter a project name');
      return;
    }

    setActionLoading(true);
    setUploadProgress(10); // starting read

    try {
      const readFilesPromises = selectedFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            // file.webkitRelativePath contains the directory tree structure
            const relativePath = file.webkitRelativePath || file.name;
            resolve({
              name: file.name,
              path: relativePath,
              content: event.target.result,
            });
          };
          reader.readAsText(file);
        });
      });

      // Wait for all files to be read into text strings
      const payloadFiles = await Promise.all(readFilesPromises);
      setUploadProgress(50); // Reading finished, uploading now

      const res = await fetch('/api/repositories/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: repoName,
          description: repoDesc || 'Locally uploaded directory',
          files: payloadFiles,
        }),
      });

      const data = await res.json();
      setUploadProgress(100);

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchRepositories();
        navigate(`/workspace/${data._id}`);
      } else {
        setError(data.message || 'Failed to upload codebase files');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to upload directory. Verify file limits.');
    } finally {
      setActionLoading(false);
      setUploadProgress(0);
    }
  };

  // Handle ZIP selection
  const handleZipSelection = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
      setZipFile(file);
      const suggestedName = file.name.replace(/\.[^/.]+$/, ""); // strip extension
      setRepoName(suggestedName);
    } else {
      alert('Please select a valid ZIP archive file.');
    }
  };

  // Upload ZIP Repository
  const handleZipSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!repoName || !zipFile) {
      setError('Please enter a project name and select a ZIP file');
      return;
    }

    setActionLoading(true);
    setUploadProgress(5);

    const formData = new FormData();
    formData.append('name', repoName);
    formData.append('description', repoDesc);
    formData.append('file', zipFile);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/repositories/upload-zip');

    // Headers
    const headers = getAuthHeaders();
    Object.keys(headers).forEach(key => {
      // Don't set Content-Type header; browser does it for multi-part FormData automatically
      if (key.toLowerCase() !== 'content-type') {
        xhr.setRequestHeader(key, headers[key]);
      }
    });

    // Upload progress event listener
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setActionLoading(false);
      setUploadProgress(0);
      if (xhr.status === 201) {
        const data = JSON.parse(xhr.responseText);
        setShowModal(false);
        resetForm();
        fetchRepositories();
        navigate(`/workspace/${data._id}`);
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          setError(data.message || 'ZIP upload failed');
        } catch (err) {
          setError('ZIP upload failed with status ' + xhr.status);
        }
      }
    };

    xhr.onerror = () => {
      setActionLoading(false);
      setUploadProgress(0);
      setError('Network error during file transfer');
    };

    xhr.send(formData);
  };

  // Delete Repo
  const handleDeleteRepo = async (id, e) => {
    e.preventDefault(); // prevent navigation on card click
    if (!window.confirm('Are you sure you want to delete this repository and its chats?')) return;

    try {
      const res = await fetch(`/api/repositories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        fetchRepositories();
      } else {
        alert('Failed to delete repository');
      }
    } catch (err) {
      alert('Network failure, could not delete');
    }
  };

  const resetForm = () => {
    setRepoName('');
    setRepoDesc('');
    setGithubUrl('');
    setSelectedFiles([]);
    setZipFile(null);
    setError('');
  };

  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
  className="bg-dark-primary d-flex flex-column"
  style={{
    minHeight: '100dvh',
    overflowX: 'hidden',
  }}
>
      <Navbar />

      <div
  className="container animate-slide-up"
  style={{
    paddingTop: 'clamp(5rem, 7vw, 6rem)',
paddingBottom: '2rem',
  }}
>
        {/* Upper stats banner */}
        <div className="row g-4 mb-5">
          <div className="col-6 col-lg-3">
            <div className="glass-card feature-card-hover p-4 text-center">
              <span className="small fw-bold text-uppercase"
style={{
  color: 'rgba(255,255,255,0.72)',
  letterSpacing: '1px',
}}>Active Repos</span>
              <h2 className="text-white fw-extrabold mt-1">{repositories.length}</h2>
            </div>
          </div>
          <div className="col-md-3">
            <div className="glass-card feature-card-hover p-4 text-center">
              <span className="small fw-bold text-uppercase"
style={{
  color: 'rgba(255,255,255,0.72)',
  letterSpacing: '1px',
}}>Code Files Indexed</span>
              <h2 className="text-gradient-primary fw-extrabold mt-1">
                {
  repositories.reduce(
    (acc, curr) =>
      acc + (curr.files?.length || curr.fileCount || 0),
    0
  )
}
              </h2>
            </div>
          </div>
          <div className="col-md-3">
            <div className="glass-card feature-card-hover p-4 text-center">
              <span className="small fw-bold text-uppercase"
style={{
  color: 'rgba(255,255,255,0.72)',
  letterSpacing: '1px',
}}>GitHub Imports {repositories.filter(r => r.source === 'github').length}</span>
              <h2
  className="fw-extrabold mt-1"
  style={{ color: '#a78bfa' }}
>
  {repositories.filter(r => r.source === 'github').length}
</h2>
            </div>
          </div>
          <div className="col-md-3">
            <div className="glass-card feature-card-hover p-4 text-center">
              <span className="small fw-bold text-uppercase"
style={{
  color: 'rgba(255,255,255,0.72)',
  letterSpacing: '1px',
}}>Local Uploads {repositories.filter(r => r.source === 'upload').length}</span>
              <h2
  className="fw-extrabold mt-1"
  style={{ color: '#34d399' }}
>
  {repositories.filter(r => r.source === 'upload').length}
</h2>
            </div>
          </div>
        </div>

        {/* Dashboard Title & Actions */}
        <div
  className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4"
>
          <div>
            <h2 className="text-white fw-bold">AI Repository Workspace</h2>
            <p className="text-secondary mb-0">Analyze repositories, explore architecture, and interact with your codebase using AI-powered retrieval.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn btn-primary-glow px-5 py-3 d-flex align-items-center justify-content-center gap-2"
            id="new-repo-btn"
          >
            <i className="bi bi-plus-lg fs-6"></i>
            New Codebase
          </button>
        </div>

        {/* Search Bar */}
        <div className="glass-card p-3 mb-5 d-flex align-items-center gap-2 border-secondary-subtle" style={{  borderRadius: '18px',borderColor: 'var(--border-color)' }}>
         <i
  className="bi bi-search"
  style={{ color: 'rgba(255,255,255,0.55)' }}
></i>
          <input
            type="text"
            className="form-control bg-transparent text-white border-0 shadow-none py-2"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Main List Grid */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading repositories...</span>
            </div>
            <p className="text-secondary mt-3">Fetching database entries...</p>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="glass-card p-5 text-center my-4">
            <i className="bi bi-stars text-muted display-4 mb-3 d-block"></i>
            <h4 className="text-white">Start Your First AI Workspace</h4>
            <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '450px' }}>
             Import a GitHub repository or upload local source files to start interacting with your codebase using AI-powered retrieval.
            </p>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="btn btn-sm btn-primary-glow px-4 py-2"
            >
              Add Project Now
            </button>
          </div>
        ) : (
          <div className="row g-4">
            {filteredRepos.map((repo) => (
              <div className="col-md-6 col-lg-4" key={repo._id}>
                <div 
                  className="glass-card feature-card-hover p-4 h-100 d-flex flex-column justify-content-between"
                  style={{ cursor: 'pointer', borderRadius: '22px', }}
                  onClick={() => navigate(`/workspace/${repo._id}`)}
                >
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span className={`badge px-2 py-1 ${repo.source === 'github' ? 'bg-primary bg-opacity-20 text-primary border border-primary-subtle' : 'bg-info bg-opacity-20 text-info border border-info-subtle'}`} style={{ fontSize: '0.75rem' }}>
                        {repo.source === 'github' ? (
                          <><i className="bi bi-github me-1"></i> GitHub</>
                        ) : (
                          <><i className="bi bi-folder-fill me-1"></i> Upload</>
                        )}
                      </span>
                      <button
                        onClick={(e) => handleDeleteRepo(repo._id, e)}
                        className="btn btn-sm btn-outline-danger border-0 p-1"
                        title="Delete codebase"
                      >
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </div>

                    <h4 className="text-white fw-bold mb-3">{repo.name}</h4>
                    <p className="text-secondary small mb-3 text-line-clamp-2" style={{ minHeight: '38px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {repo.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="border-top pt-3 mt-2 d-flex justify-content-between align-items-center text-muted" style={{ fontSize: '0.8rem', borderColor: 'var(--border-color)' }}>
                    <span>
                      <i className="bi bi-file-code me-1 text-gradient-primary"></i> 
                      {repo.fileCount || 0} file(s)
                    </span>
                    <span>
                      {new Date(repo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Codebase Upload Modal (Custom Floating UI Box) */}
      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.65)',backdropFilter: 'blur(8px)', zIndex: 1050 }}>
          <div className="glass-panel animate-slide-up w-100 dashboard-modal" style={{
  width: 'min(92vw, 600px)',
  maxHeight: '90vh',
  overflowY: 'auto',

  borderRadius: '28px',
  border: '1px solid var(--border-color-glow)',
}}>
            
            {/* Modal Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="text-white fw-bold m-0">Add New Codebase</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="btn btn-sm btn-outline-secondary border-0 p-1 text-white fs-5"
                disabled={actionLoading}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Selector tabs */}
            <div
  className="btn-group w-100 mb-4 modal-button-group" role="group">
              <button 
                type="button" 
                className={`btn py-2.5 ${modalType === 'github' ? 'btn-primary-glow' : 'btn-secondary-outline'}`}
                onClick={() => { resetForm(); setModalType('github'); }}
                disabled={actionLoading}
              >
                <i className="bi bi-github me-2"></i> GitHub
              </button>
              <button 
                type="button" 
                className={`btn py-2.5 ${modalType === 'upload' ? 'btn-primary-glow' : 'btn-secondary-outline'}`}
                onClick={() => { resetForm(); setModalType('upload'); }}
                disabled={actionLoading}
              >
                <i className="bi bi-folder-fill me-2"></i> Folder
              </button>
              <button 
                type="button" 
                className={`btn py-2.5 ${modalType === 'zip' ? 'btn-primary-glow' : 'btn-secondary-outline'}`}
                onClick={() => { resetForm(); setModalType('zip'); }}
                disabled={actionLoading}
              >
                <i className="bi bi-file-zip-fill me-2"></i> ZIP File
              </button>
            </div>

            {error && (
              <div className="alert alert-danger py-2 border-0 bg-danger bg-opacity-10 text-danger small rounded mb-3" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </div>
            )}

            {/* GitHub Form */}
            {modalType === 'github' && (
              <form onSubmit={handleGithubImport}>
                <div className="mb-3">
                  <label className="form-label-custom">Project Name</label>
                  <input
                    type="text"
                    className="form-control form-control-custom"
                    placeholder="react-todo-app"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    required
                    disabled={actionLoading}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label-custom">GitHub URL (Public Repo)</label>
                  <input
                    type="url"
                    className="form-control form-control-custom"
                    placeholder="https://github.com/facebook/react"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    required
                    disabled={actionLoading}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label-custom">Description (Optional)</label>
                  <textarea
                    className="form-control form-control-custom"
                    placeholder="Brief outline of the project context"
                    rows="2"
                    value={repoDesc}
                    onChange={(e) => setRepoDesc(e.target.value)}
                    disabled={actionLoading}
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary-glow w-100 py-3 mt-2"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Importing from GitHub (Fetching files)...
                    </>
                  ) : (
                    'Import Repository'
                  )}
                </button>
              </form>
            )}

            {/* Folder Upload Form */}
            {modalType === 'upload' && (
              <form onSubmit={handleLocalUpload}>
                <div className="mb-3">
                  <label className="form-label-custom">Folder Picker</label>
                  <div className="bg-dark-secondary p-4 rounded border text-center border-secondary-subtle mb-3" style={{ borderColor: 'var(--border-color) !important' }}>
                    <i className="bi bi-cloud-arrow-up text-gradient-primary display-6 mb-2 d-block animate-pulse"></i>
                    <input
                      type="file"
                      className="d-none"
                      id="folder-input"
                      webkitdirectory=""
                      directory=""
                      multiple
                      onChange={handleFolderSelection}
                      disabled={actionLoading}
                    />
                    <label htmlFor="folder-input" className="btn btn-sm btn-secondary-outline px-3 py-2 cursor-pointer">
                      Choose Directory
                    </label>
                    <span className="text-secondary small d-block mt-2">
                      {selectedFiles.length > 0 ? (
                        <strong className="text-white">{selectedFiles.length} file(s) ready to upload</strong>
                      ) : (
                        'Selects all text-based source files recursively'
                      )}
                    </span>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label-custom">Project Name</label>
                  <input
                    type="text"
                    className="form-control form-control-custom"
                    placeholder="my-node-service"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    required
                    disabled={actionLoading}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label-custom">Description (Optional)</label>
                  <textarea
                    className="form-control form-control-custom"
                    placeholder="Brief outline of the project context"
                    rows="2"
                    value={repoDesc}
                    onChange={(e) => setRepoDesc(e.target.value)}
                    disabled={actionLoading}
                  ></textarea>
                </div>

                {uploadProgress > 0 && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between text-secondary small mb-1">
                      <span>Uploading File Contents</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="progress bg-dark-primary" style={{ height: '6px' }}>
                      <div 
                        className="progress-bar bg-primary" 
                        role="progressbar" 
                        style={{ width: `${uploadProgress}%`, transition: 'width 0.3s ease' }}
                        aria-valuenow={uploadProgress} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      ></div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary-glow w-100 py-3 mt-2"
                  disabled={actionLoading || selectedFiles.length === 0}
                >
                  {actionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Reading and uploading codebase files...
                    </>
                  ) : (
                    'Upload and Scan Folder'
                  )}
                </button>
              </form>
            )}

            {/* ZIP Upload Form */}
            {modalType === 'zip' && (
              <form onSubmit={handleZipSubmit}>
                <div className="mb-3">
                  <label className="form-label-custom">ZIP File Picker</label>
                  <div className="bg-dark-secondary p-4 rounded border text-center border-secondary-subtle mb-3" style={{ borderColor: 'var(--border-color) !important' }}>
                    <i className="bi bi-file-zip-fill text-gradient-primary display-6 mb-2 d-block animate-pulse"></i>
                    <input
                      type="file"
                      className="d-none"
                      id="zip-file-input"
                      accept=".zip"
                      onChange={handleZipSelection}
                      disabled={actionLoading}
                    />
                    <label htmlFor="zip-file-input" className="btn btn-sm btn-secondary-outline px-3 py-2 cursor-pointer">
                      Select ZIP Archive
                    </label>
                    <span className="text-secondary small d-block mt-2">
                      {zipFile ? (
                        <strong className="text-white">{zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(2)} MB)</strong>
                      ) : (
                        'Upload a repository zip archive (max 50MB)'
                      )}
                    </span>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label-custom">Project Name</label>
                  <input
                    type="text"
                    className="form-control form-control-custom"
                    placeholder="my-zip-repository"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    required
                    disabled={actionLoading}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label-custom">Description (Optional)</label>
                  <textarea
                    className="form-control form-control-custom"
                    placeholder="Brief outline of the project context"
                    rows="2"
                    value={repoDesc}
                    onChange={(e) => setRepoDesc(e.target.value)}
                    disabled={actionLoading}
                  ></textarea>
                </div>

                {uploadProgress > 0 && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between text-secondary small mb-1">
                      <span>Uploading ZIP Archive</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="progress bg-dark-primary" style={{ height: '6px' }}>
                      <div 
                        className="progress-bar bg-primary" 
                        role="progressbar" 
                        style={{ width: `${uploadProgress}%`, transition: 'width 0.1s ease' }}
                        aria-valuenow={uploadProgress} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      ></div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary-glow w-100 py-3 mt-2"
                  disabled={actionLoading || !zipFile}
                >
                  {actionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Uploading and indexing ZIP archive...
                    </>
                  ) : (
                    'Upload and Index ZIP'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
