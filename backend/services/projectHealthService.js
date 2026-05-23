export const analyzeProjectHealth = (
  repository
) => {

  const files =
    repository.files || [];

  let score = 100;

  const issues = [];
  const recommendations = [];

  // FILE SIZE ANALYSIS

  files.forEach(file => {

    const content =
      file.content || '';

    const lines =
      content.split('\n').length;

    // HUGE FILES

    if (lines > 400) {

      score -= 5;

      issues.push(
        `Large file detected: ${file.path}`
      );

      recommendations.push(
        `Split ${file.name} into smaller modules`
      );
    }

    // VERY LARGE FILES

    if (lines > 800) {

      score -= 10;

      issues.push(
        `Very large file: ${file.path}`
      );
    }

    // MISSING ERROR HANDLING

    if (
      file.path.includes('route') &&
      !content.includes('try')
    ) {

      score -= 3;

      issues.push(
        `Missing error handling in ${file.name}`
      );
    }

    // CONSOLE LOG DETECTION

    if (
      content.includes('console.log')
    ) {

      score -= 1;

      issues.push(
        `Console logs found in ${file.name}`
      );
    }

  });

  // FOLDER STRUCTURE CHECK

  const hasComponents =
    files.some(f =>
      f.path.includes('components')
    );

  const hasRoutes =
    files.some(f =>
      f.path.includes('routes')
    );

  const hasModels =
    files.some(f =>
      f.path.includes('models')
    );

  if (!hasComponents) {
    score -= 5;

    issues.push(
      'No components folder detected'
    );
  }

  if (!hasRoutes) {
    score -= 5;

    issues.push(
      'No routes folder detected'
    );
  }

  if (!hasModels) {
    score -= 5;

    issues.push(
      'No models folder detected'
    );
  }

  // FINAL SCORE

  if (score < 0) {
    score = 0;
  }

  let healthStatus = 'Excellent';

  if (score < 90) {
    healthStatus = 'Good';
  }

  if (score < 75) {
    healthStatus = 'Average';
  }

  if (score < 60) {
    healthStatus = 'Poor';
  }

  return {

    score,

    healthStatus,

    totalFiles: files.length,

    issues,

    recommendations
  };
};