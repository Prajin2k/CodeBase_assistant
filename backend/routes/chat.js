import express from 'express';
import Repository from '../models/Repository.js';
import ChatSession from '../models/ChatSession.js';
import { protect } from '../middleware/auth.js';
import { spawn } from 'child_process';
import {
  analyzeDependencies
} from '../services/dependencyService.js';
import {
  recommendFiles
} from '../services/recommendationService.js';
import {
  analyzePerformance
} from '../services/performanceService.js';
import { generateWorkflow } from '../services/workflowService.js';
import {
  analyzeProjectHealth
} from '../services/projectHealthService.js';
import askGroq from '../utils/aiService.js';
import buildRepositoryContext from '../utils/contextBuilder.js';
import path from 'path';

import {
  readWorkspaceFile,
  writeWorkspaceFile
} from '../utils/workspaceManager.js';
const router = express.Router();
// @desc    Get chat history for a repository
// @route   GET /api/chat/:repoId
// @access  Private
router.get('/:repoId', protect, async (req, res) => {
  const { repoId } = req.params;

  try {
    let chatSession = await ChatSession.findOne({ repository: repoId, user: req.user._id });
    if (!chatSession) {
      chatSession = await ChatSession.create({
        repository: repoId,
        user: req.user._id,
        messages: [],
      });
    }
    return res.json(chatSession);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Submit message & get AI response (streaming)
// @route   POST /api/chat/:repoId
// @access  Private
router.post('/:repoId', protect, async (req, res) => {
  const { repoId } = req.params;
  const {
  message,
  agentMode,
  activeFile
} = req.body;

  try {
    if (!message) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    const repository = await Repository.findOne({ _id: repoId, owner: req.user._id });
    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' });
    }

    let chatSession = await ChatSession.findOne({ repository: repoId, user: req.user._id });
    if (!chatSession) {
      chatSession = await ChatSession.create({
        repository: repoId,
        user: req.user._id,
        messages: [],
      });
    }
 const lowerMessage = message.toLowerCase();

const simpleQueries = [
  'overview',
  'what is this',
  'how does this work',
  'what this project does',
  'explain this project',
  'about this project',
  'summarize project'
];
const isSimpleQuery = simpleQueries.some(
  q => lowerMessage.includes(q)
);
    const isCodeGeneration =
  lowerMessage.includes('generate') ||
  lowerMessage.includes('create') ||
  lowerMessage.includes('build') ||
  lowerMessage.includes('write code') ||
      lowerMessage.includes('make component');
    const isCodeEdit =
  lowerMessage.includes('improve') ||
  lowerMessage.includes('modify') ||
  lowerMessage.includes('update') ||
  lowerMessage.includes('fix') ||
  lowerMessage.includes('refactor') ||
      lowerMessage.includes('convert');
    const workflowKeywords = [
  'workflow',
  'architecture',
  'diagram',
  'visualize',
  'visualization',
  'flowchart',
  'system design',
  'dependency graph',
  'graph',
  'project structure',
  'code structure',
  'repository structure',
  'frontend backend flow',
  'visual flow',
      'architecture flow',
    'show structure',
  'show architecture',
  'show workflow',
  'visual representation',
  'visual view',
  'draw architecture',
  'repository graph',
  'system flow',
  'application flow',
  'visual map'
];
const recommendationKeywords = [
  'where is',
  'find',
  'locate',
  'search for',
  'which file',
  'show related files'
];

const isRecommendationRequest =
  recommendationKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  );
const isWorkflowRequest =
  workflowKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  ) &&
  !lowerMessage.includes('algorithm') &&
  !lowerMessage.includes('data structure');
    if (isWorkflowRequest) {

  const workflowData = generateWorkflow(
    repository.files || []
  );
const architectureExplanation = `
This repository follows a structured architecture
with frontend, backend, database, and AI modules.
The workflow visualization shows how components
interact across the system.
`;
  res.setHeader(
    'Content-Type',
    'text/event-stream'
  );

  res.setHeader(
    'Cache-Control',
    'no-cache'
  );

  res.setHeader(
    'Connection',
    'keep-alive'
  );

  res.write(
    `data: ${JSON.stringify({
      workflow: workflowData
    })}\n\n`
  );

res.write(
  `data: ${JSON.stringify({
    chunk: architectureExplanation
  })}\n\n`
);

  res.write('data: [DONE]\n\n');

  return res.end();
    }
    const healthKeywords = [
  'project health',
  'health analysis',
  'analyze project',
  'code quality',
  'project quality',
  'scan project',
  'analyze repository',
  'performance issues',
  'security issues',
  'optimize project',
  'code smells'
];

const isHealthAnalysis =
  healthKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  );
    if (isHealthAnalysis) {

  const analysis =
    analyzeProjectHealth(
      repository
    );

  const response = `

# 🧠 Project Health Report

## Overall Score
${analysis.score}/100

## Status
${analysis.healthStatus}

## Repository Stats
- Total Files: ${analysis.totalFiles}

## ⚠️ Issues Detected

${analysis.issues.length
  ? analysis.issues
      .map(issue => `- ${issue}`)
      .join('\n')
  : 'No major issues detected.'
}

## ✅ Recommendations

${analysis.recommendations.length
  ? analysis.recommendations
      .map(rec => `- ${rec}`)
      .join('\n')
  : 'Project structure looks good.'
}

`;

  res.setHeader(
    'Content-Type',
    'text/event-stream'
  );

  res.setHeader(
    'Cache-Control',
    'no-cache'
  );

  res.setHeader(
    'Connection',
    'keep-alive'
  );

  res.write(
    `data: ${JSON.stringify({
      chunk: response
    })}\n\n`
  );

  res.write('data: [DONE]\n\n');

  return res.end();
    }
    if (isRecommendationRequest) {

  const recommendations =
    recommendFiles(
      repository,
      message
    );

  const response = `

# 🧠 Recommended Files

${recommendations.length
  ? recommendations
      .map(file => `
- 📄 ${file.path}
  (${file.language})
`)
      .join('\n')
  : 'No related files found.'
}

`;

  res.setHeader(
    'Content-Type',
    'text/event-stream'
  );

  res.setHeader(
    'Cache-Control',
    'no-cache'
  );

  res.setHeader(
    'Connection',
    'keep-alive'
  );

  res.write(
    `data: ${JSON.stringify({
      chunk: response,
      recommendations
    })}\n\n`
  );

  res.write('data: [DONE]\n\n');

  return res.end();
}
const performanceKeywords = [
  'optimize performance',
  'performance issues',
  'performance analysis',
  'performance bottleneck',
  'optimize project',
  'speed improvements',
  'improve performance',
  'performance optimization'
];

const isPerformanceAnalysis =
  performanceKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  );
    if (isPerformanceAnalysis) {

  const analysis =
    analyzePerformance(
      repository
    );

  const response = `

# ⚡ Performance Optimization Report

## ⚠️ Issues Detected

${analysis.issues.length
  ? analysis.issues
      .map(issue => `- ${issue}`)
      .join('\n')
  : 'No major performance issues detected.'
}

## 🚀 Optimization Suggestions

${analysis.optimizations.length
  ? analysis.optimizations
      .map(opt => `- ${opt}`)
      .join('\n')
  : 'Project performance looks good.'
}

`;

  res.setHeader(
    'Content-Type',
    'text/event-stream'
  );

  res.setHeader(
    'Cache-Control',
    'no-cache'
  );

  res.setHeader(
    'Connection',
    'keep-alive'
  );

  res.write(
    `data: ${JSON.stringify({
      chunk: response
    })}\n\n`
  );

  res.write('data: [DONE]\n\n');

  return res.end();
}
const dependencyKeywords = [
  'analyze dependencies',
  'dependency analysis',
  'unused packages',
  'npm packages',
  'package analysis',
  'bundle size',
  'dependency issues',
  'libraries used'
];

const isDependencyAnalysis =
  dependencyKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  );
    if (isDependencyAnalysis) {

  const analysis =
    analyzeDependencies(
      repository
    );

  const response = `

# 📦 Dependency Analysis Report

## Total Dependencies
${analysis.totalDependencies || 0}

## ⚠️ Issues Detected

${analysis.issues.length
  ? analysis.issues
      .map(issue => `- ${issue}`)
      .join('\n')
  : 'No dependency issues found.'
}

## ✅ Recommendations

${analysis.recommendations.length
  ? analysis.recommendations
      .map(rec => `- ${rec}`)
      .join('\n')
  : 'Dependencies look optimized.'
}

`;

  res.setHeader(
    'Content-Type',
    'text/event-stream'
  );

  res.setHeader(
    'Cache-Control',
    'no-cache'
  );

  res.setHeader(
    'Connection',
    'keep-alive'
  );

  res.write(
    `data: ${JSON.stringify({
      chunk: response
    })}\n\n`
  );

  res.write('data: [DONE]\n\n');

  return res.end();
}
if (isSimpleQuery) {

  chatSession.messages.push({
    sender: 'user',
    text: message
  });

  await chatSession.save();

  const { context } =
    buildRepositoryContext(
      repository,
      message
    );

  const aiResponse =
    await askGroq({
      message,
      context,
      agentMode
    });

  chatSession.messages.push({
    sender: 'assistant',
    text: aiResponse
  });

  await chatSession.save();

  res.setHeader(
    'Content-Type',
    'text/event-stream'
  );

  res.setHeader(
    'Cache-Control',
    'no-cache'
  );

  res.setHeader(
    'Connection',
    'keep-alive'
  );

  res.write(
    `data: ${JSON.stringify({
      chunk: aiResponse
    })}\n\n`
  );

  res.write('data: [DONE]\n\n');

  return res.end();
}
    if (isCodeEdit && activeFile) {

  const aiResponse =
    await askGroq({
      message: `
Modify this file.

USER REQUEST:
${message}

FILE PATH:
${activeFile.path}

CURRENT CODE:
${activeFile.content}
`,
      context: '',
      agentMode: 'generator'
    });

  chatSession.messages.push({
    sender: 'assistant',
    text: aiResponse
  });

  await chatSession.save();

  res.write(
    `data: ${JSON.stringify({
      chunk: aiResponse
    })}\n\n`
  );

  res.write('data: [DONE]\n\n');

  return res.end();
}
    if (isCodeGeneration) {

  chatSession.messages.push({
    sender: 'user',
    text: message
  });

  await chatSession.save();

  const { context } =
    buildRepositoryContext(
      repository,
      message
    );

  const aiResponse =
    await askGroq({
      message,
      context,
      agentMode: 'generator'
    });

  chatSession.messages.push({
    sender: 'assistant',
    text: aiResponse
  });

  await chatSession.save();

  res.setHeader(
    'Content-Type',
    'text/event-stream'
  );

  res.write(
    `data: ${JSON.stringify({
      chunk: aiResponse
    })}\n\n`
  );

  res.write('data: [DONE]\n\n');

  return res.end();
    }

    // Save user message
    chatSession.messages.push({ sender: 'user', text: message });
    await chatSession.save();

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Flush the headers to establish SSE connection

    // Spawn python RAG query process
    const pythonProcess = spawn('py', [
      path.join(process.cwd(), 'rag_service.py'),
      'query',
      repoId,
      message,
      agentMode || 'developer'
    ], {
      env: {
        ...process.env,
        GROQ_API_KEY: process.env.GROQ_API_KEY
      }
    });
const timeout = setTimeout(() => {
  pythonProcess.kill();

  res.write(
    `data: ${JSON.stringify({
      chunk: '⚠️ AI request timed out.'
    })}\n\n`
  );

  res.write('data: [DONE]\n\n');
  if (!res.writableEnded) {
  res.end();
}

}, 60000);
    let completeResponse = '';

    pythonProcess.stdout.on('data', (data) => {
     const chunk = data.toString('utf8');

completeResponse += chunk;

// Don't stream internal RAG errors
if (
  !chunk.includes('Repository index database not found') &&
  !chunk.includes('Error')
) {
  res.write(
    `data: ${JSON.stringify({ chunk })}\n\n`
  );
}
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[RAG Query STDERR]: ${data.toString('utf8')}`);
    });
    pythonProcess.on('error', (err) => {
  console.error('Failed to start Python process:', err);
clearTimeout(timeout);
  res.write(
    `data: ${JSON.stringify({
      chunk: '⚠️ Failed to start AI engine.'
    })}\n\n`
  );

  res.write('data: [DONE]\n\n');
 if (!res.writableEnded) {
  res.end();
}
});
    pythonProcess.on('close', async (code) => {
  console.log(
    `[RAG Query] Process closed with exit code ${code}`
  );

 if (
  completeResponse.includes(
    'Repository index database not found'
  ) ||
  completeResponse.includes('Error')
) {

  const { context } =
    buildRepositoryContext(
      repository,
      message
    );

  const fallbackResponse =
    await askGroq({
      message,
      context,
      agentMode
    });

  completeResponse = fallbackResponse;

  res.write(
    `data: ${JSON.stringify({
      chunk: fallbackResponse
    })}\n\n`
  );
}

  // Stream end
if (!res.writableEnded) {
  res.write('data: [DONE]\n\n');
  res.end();
}

  // Save assistant response
  if (completeResponse.trim()) {
    chatSession.messages.push({
      sender: 'assistant',
      text: completeResponse
    });

    await chatSession.save();
  }

  clearTimeout(timeout);
});

    // Clean up subprocess if client drops connection prematurely
    req.on('close', () => {
  if (!pythonProcess.killed) {
    pythonProcess.kill();
  }
});

  } catch (error) {
    console.error('Streaming error:', error);
    try {
      res.write(`data: ${JSON.stringify({ chunk: `⚠️ **Error:** ${error.message}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (e) {
      if (!res.headersSent) {
        return res.status(500).json({ message: error.message });
      }
    }
  }
});
router.post(
  '/:repoId/file',
  protect,
  async (req, res) => {
    try {
      const { repoId } = req.params;
      const { path: filePath, content } = req.body;

      writeWorkspaceFile(
        repoId,
        filePath,
        content
      );

      res.json({
        success: true,
        message: 'File updated'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);
router.get(
  '/:repoId/file',
  protect,
  async (req, res) => {
    try {
      const { repoId } = req.params;
      const { path: filePath } = req.query;

      const content = readWorkspaceFile(
        repoId,
        filePath
      );

      res.json({
        success: true,
        content
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);
export default router;
