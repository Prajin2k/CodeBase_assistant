const buildRepositoryContext = (
  repository,
  userMessage
) => {

  const files = repository.files || [];

  const query =
    userMessage.toLowerCase();

  // Remove useless words
  const stopWords = [
    'where',
    'is',
    'the',
    'a',
    'an',
    'find',
    'show',
    'locate',
    'search',
    'for',
    'how',
    'does',
    'explain'
  ];

  const keywords =
    query
      .split(/\s+/)
      .filter(
        word =>
          word.length > 2 &&
          !stopWords.includes(word)
      );

  // FILE RELEVANCE SCORING

  const scoredFiles = files.map(file => {

    let score = 0;

    const path =
      (file.path || '').toLowerCase();

    const content =
      (file.content || '').toLowerCase();

    // HIGH PRIORITY FILES

    if (
      path.includes('auth') ||
      path.includes('login')
    ) {
      score += 5;
    }

    if (
      path.includes('api') ||
      path.includes('route')
    ) {
      score += 4;
    }

    if (
      path.includes('database') ||
      path.includes('model')
    ) {
      score += 4;
    }

    // KEYWORD MATCHING

    keywords.forEach(keyword => {

      // Path relevance
      if (path.includes(keyword)) {
        score += 15;
      }

      // Content relevance
      if (content.includes(keyword)) {
        score += 8;
      }

      // Exact function/import matches
      const regex =
        new RegExp(
          `\\b${keyword}\\b`,
          'g'
        );

      const matches =
        content.match(regex);

      if (matches) {
        score += matches.length * 2;
      }

    });

    return {
      file,
      score
    };

  });

  // SORT BY BEST MATCHES

  const relevantFiles =
    scoredFiles
      .sort((a, b) =>
        b.score - a.score
      )
      .slice(0, 10)
      .map(item => item.file);

  // BUILD AI CONTEXT

  const context =
    relevantFiles
      .map(file => {

        const trimmedContent =
          (file.content || '')
            .slice(0, 5000);

        return `

FILE: ${file.path}

LANGUAGE: ${file.language}

CONTENT:
${trimmedContent}

`;
      })
      .join('\n\n');

  return {
    relevantFiles,
    context
  };
};

export default buildRepositoryContext;