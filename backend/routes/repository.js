import express from 'express';
import Repository from '../models/Repository.js';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { generateWorkflow } from '../services/workflowService.js';
import {
  saveRepositoryFiles
} from '../utils/workspaceManager.js';
const router = express.Router();

// Helper to index codebase with RAG
const indexCodebaseRAG = (repository) => {
  console.log("INDEXING STARTED");
  const repoId = repository._id.toString();
  const tempJsonPath = path.join(process.cwd(), `temp_${repoId}.json`);

  try {
    const data = {
      name: repository.name,
      files: repository.files.map(f => ({
        path: f.path,
        name: f.name,
        content: f.content || '',
        language: f.language
      }))
    };

    fs.writeFileSync(tempJsonPath, JSON.stringify(data, null, 2), 'utf8');
console.log("SPAWNING PYTHON INDEXER");
    const pythonProcess = spawn('py', [
      path.join(process.cwd(), 'rag_service.py'),
      'index',
      repoId,
      tempJsonPath
    ]);
const timeout = setTimeout(() => {
  pythonProcess.kill();
  console.error('[RAG Indexer] Timed out');
}, 120000);
    pythonProcess.stdout.on('data', (data) => {
        console.log("INDEXER STDOUT:");
  console.log(data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
  console.error('[RAG Indexer STDERR FULL]:');
  console.error(data.toString());
});
    pythonProcess.on('error', (err) => {
      clearTimeout(timeout);
  console.error('[RAG Indexer ERROR]:', err);
});
    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);
      console.log(`[RAG Indexer] Finished with exit code ${code}`);
      try {
        if (fs.existsSync(tempJsonPath)) {
          fs.unlinkSync(tempJsonPath);
        }
      } catch (e) {
        console.error("Failed to delete temp file:", e);
      }
    });
  } catch (err) {
    console.error("Error triggering codebase indexing:", err);
    try {
      if (fs.existsSync(tempJsonPath)) {
        fs.unlinkSync(tempJsonPath);
      }
    } catch (e) {}
  }
};

// Helper to detect language from extension
const getLanguageFromExtension = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'sh':
      return 'bash';
    default:
      return 'text';
  }
};

// @desc    Get user's repositories (excluding full file details for list speed)
// @route   GET /api/repositories
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const repositories = await Repository.find({ owner: req.user._id }).select('-files');
    return res.json(repositories);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Get specific repository details (including files)
// @route   GET /api/repositories/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const repository = await Repository.findById(
  req.params.id
);
    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' });
    }
    return res.json(repository);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Upload repository files directly
// @route   POST /api/repositories/upload
// @access  Private
router.post('/upload', protect, async (req, res) => {
  const { name, description, files } = req.body;

  try {
    if (!name || !files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: 'Repository name and files are required' });
    }

    const processedFiles = files.map(file => ({
      name: file.name,
      path: file.path,
     content: file.content || '',
      language: getLanguageFromExtension(file.name),
    }));
    const limitedFiles = processedFiles.slice(0, 30);
    const repository = await Repository.create({
      name,
      description: description || 'Local upload',
      owner: req.user._id,
      source: 'upload',
      files: limitedFiles,
    });
    saveRepositoryFiles(
  repository._id.toString(),
  repository.files
);
    // Trigger RAG indexing in the background
    indexCodebaseRAG(repository);

    return res.status(201).json({
      _id: repository._id,
      name: repository.name,
      description: repository.description,
      source: repository.source,
      fileCount: repository.files.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Import public GitHub repository
// @route   POST /api/repositories/import-github
// @access  Private
router.post('/import-github', protect, async (req, res) => {
  const { name, description, githubUrl } = req.body;

  try {
    if (!name || !githubUrl) {
      return res.status(400).json({ message: 'Repository name and GitHub URL are required' });
    }

    // Parse owner and repo name from githubUrl
    let urlClean = githubUrl.trim();
    if (urlClean.endsWith('/')) {
      urlClean = urlClean.slice(0, -1);
    }
    
    // Support formats: https://github.com/owner/repo or github.com/owner/repo or owner/repo
    let owner = '';
    let repo = '';

    if (urlClean.includes('github.com')) {
      const parts = urlClean.replace('https://', '').replace('http://', '').replace('www.', '').split('/');
      owner = parts[1];
      repo = parts[2];
    } else {
      const parts = urlClean.split('/');
      if (parts.length === 2) {
        owner = parts[0];
        repo = parts[1];
      }
    }

    if (repo && repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }

    if (!owner || !repo) {
      return res.status(400).json({ message: 'Invalid GitHub repository URL structure' });
    }

    // 1. Fetch Repository Info to get Default Branch
    const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'User-Agent': 'AI-Codebase-Assistant-App' }
    });

    if (!repoInfoRes.ok) {
      return res.status(400).json({ 
        message: `GitHub Repository not found or is private. Status: ${repoInfoRes.status}` 
      });
    }

    const repoInfo = await repoInfoRes.json();
    const branch = repoInfo.default_branch || 'main';

    // 2. Fetch Git Tree recursively
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: { 'User-Agent': 'AI-Codebase-Assistant-App' } }
    );

    if (!treeRes.ok) {
      return res.status(400).json({ 
        message: `Failed to retrieve repository tree structure from GitHub.` 
      });
    }

    const treeData = await treeRes.json();
    
    // Filter tree to only get files (type = blob) and skip common assets (images, binary, node_modules)
    const fileNodes = treeData.tree.filter(
      (node) =>
        node.type === 'blob' &&
        !node.path.includes('node_modules/') &&
        !node.path.includes('.git/') &&
        !node.path.includes('package-lock.json') &&
        !node.path.includes('yarn.lock') &&
        !node.path.includes('pnpm-lock.yaml') &&
        !/\.(png|jpe?g|gif|ico|svg|woff2?|eot|ttf|otf|mp4|zip|gz|pdf)$/i.test(node.path)
    );

    // Limit files to prevent rate limits or timeout (max 50 files)
    const filesToImport = fileNodes.slice(0, 50);

    const importedFiles = [];

    // 3. Fetch file content for each file (Parallel with Promise.all)
    await Promise.all(
      filesToImport.map(async (fileNode) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fileNode.path}`;
          const contentRes = await fetch(rawUrl, {
            headers: { 'User-Agent': 'AI-Codebase-Assistant-App' }
          });
          
          let content = '';
          if (contentRes.ok) {
            content = await contentRes.text();
          }

          importedFiles.push({
            name: fileNode.path.split('/').pop(),
            path: fileNode.path,
            content: content,
            language: getLanguageFromExtension(fileNode.path),
          });
        } catch (err) {
          console.error(`Failed to fetch file contents for ${fileNode.path}:`, err.message);
          // Still push file placeholder
          importedFiles.push({
            name: fileNode.path.split('/').pop(),
            path: fileNode.path,
            content: `// Error loading file contents: ${err.message}`,
            language: getLanguageFromExtension(fileNode.path),
          });
        }
      })
    );

    if (importedFiles.length === 0) {
      return res.status(400).json({ message: 'No valid text files found in the repository' });
    }

    const repository = await Repository.create({
      name,
      description: description || repoInfo.description || `Imported from ${githubUrl}`,
      owner: req.user._id,
      source: 'github',
      githubUrl: githubUrl,
      files: importedFiles,
    });
saveRepositoryFiles(
  repository._id.toString(),
  repository.files
);
    // Trigger RAG indexing in the background
   indexCodebaseRAG(repository);

    return res.status(201).json({
      _id: repository._id,
      name: repository.name,
      description: repository.description,
      source: repository.source,
      githubUrl: repository.githubUrl,
      fileCount: repository.files.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Multer config for memory-buffered single file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // limit to 50MB archives
});

// @desc    Upload repository via ZIP file
// @route   POST /api/repositories/upload-zip
// @access  Private
router.post('/upload-zip', protect, upload.single('file'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Repository name is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a ZIP file' });
    }

    // Process ZIP in memory
    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();
    const processedFiles = [];

    for (const entry of zipEntries) {
      const path = entry.entryName;

      // Skip folders, node_modules, .git, locking descriptors, and binaries
      if (
        entry.isDirectory ||
        path.includes('node_modules/') ||
        path.includes('.git/') ||
        path.includes('package-lock.json') ||
        path.includes('yarn.lock') ||
        path.includes('pnpm-lock.yaml') ||
        /\.(png|jpe?g|gif|ico|svg|woff2?|eot|ttf|otf|mp4|zip|gz|pdf)$/i.test(path)
      ) {
        continue;
      }

      // Read text content
      const content = entry.getData().toString('utf8');
      const fileName = path.split('/').pop();

      processedFiles.push({
        name: fileName,
        path: path,
        content: content,
        language: getLanguageFromExtension(fileName),
      });
    }

    if (processedFiles.length === 0) {
      return res.status(400).json({ message: 'No valid text/code files found in the ZIP archive' });
    }

    const repository = await Repository.create({
      name,
      description: description || 'ZIP Upload',
      owner: req.user._id,
      source: 'upload',
      files: processedFiles,
    });
saveRepositoryFiles(
  repository._id.toString(),
  repository.files
);
    // Trigger RAG indexing in the background
   indexCodebaseRAG(repository);

    return res.status(201).json({
      _id: repository._id,
      name: repository.name,
      description: repository.description,
      source: repository.source,
      fileCount: repository.files.length,
    });
  } catch (error) {
    console.error('ZIP processing error:', error);
    return res.status(500).json({ message: `ZIP Processing Failed: ${error.message}` });
  }
});

// @desc    Delete repository
// @route   DELETE /api/repositories/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
const repository = await Repository.findById(
  req.params.id
);

    if (!repository) {
      return res.status(404).json({
        message: 'Repository not found'
      });
    }

    // Delete MongoDB record
    await Repository.deleteOne({ _id: repository._id });

    // Delete vector store safely
    try {
      const persistDir = path.join(
        process.cwd(),
        'vector_store',
        req.params.id
      );

      if (fs.existsSync(persistDir)) {
        fs.rmSync(persistDir, {
          recursive: true,
          force: true
        });

        console.log(
          `[Vector Store] Deleted ${persistDir}`
        );
      }
    } catch (vectorErr) {
      console.error(
        '[Vector Store Delete Error]:',
        vectorErr
      );
    }

    return res.json({
      success: true,
      message: 'Repository deleted successfully'
    });

  } catch (error) {
    console.error('[Repository Delete Error]:', error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router.get('/:id/workflow', async (req, res) => {

  try {

   const repository = await Repository.findById(
  req.params.id
);

    if (!repository) {
      return res.status(404).json({
        message: 'Repository not found'
      });
    }

    const workflow = generateWorkflow(repository.files);

    res.json(workflow);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: error.message
    });
  }
});
export default router;

