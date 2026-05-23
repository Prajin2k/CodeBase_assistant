import fs from 'fs';
import path from 'path';

const WORKSPACE_ROOT = path.join(process.cwd(), 'workspaces');

export const ensureWorkspace = (repoId) => {
  const repoPath = path.join(WORKSPACE_ROOT, repoId);

  if (!fs.existsSync(WORKSPACE_ROOT)) {
    fs.mkdirSync(WORKSPACE_ROOT);
  }

  if (!fs.existsSync(repoPath)) {
    fs.mkdirSync(repoPath, { recursive: true });
  }

  return repoPath;
};

export const saveRepositoryFiles = (repoId, files) => {
  const repoPath = ensureWorkspace(repoId);

  files.forEach(file => {
    const fullPath = path.join(repoPath, file.path);

    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, file.content || '', 'utf8');
  });

  return repoPath;
};

export const readWorkspaceFile = (repoId, filePath) => {
  const fullPath = path.join(
    WORKSPACE_ROOT,
    repoId,
    filePath
  );

  if (!fs.existsSync(fullPath)) {
    throw new Error('File not found');
  }

  return fs.readFileSync(fullPath, 'utf8');
};

export const writeWorkspaceFile = (
  repoId,
  filePath,
  content
) => {
  const fullPath = path.join(
    WORKSPACE_ROOT,
    repoId,
    filePath
  );

  fs.writeFileSync(fullPath, content, 'utf8');

  return true;
};